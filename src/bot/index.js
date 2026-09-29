const { Telegraf, Markup } = require("telegraf");
const config = require("../config/env");
const db = require("../database");
const { attachAdminFlag } = require("./middlewares/isAdmin");
const { registerStartHandler } = require("./handlers/start");
const { registerAdminHandler } = require("./handlers/admin");
const { registerMenuHandlers } = require("./handlers/menu");
const { registerCatalogHandlers, renderCart } = require("./handlers/catalog");
const {
  registerCheckoutHandlers,
  proceedToPaymentStep,
} = require("./handlers/checkout");
const { searchResultsKeyboard } = require("./keyboards/catalog");
const { shareContactKeyboard } = require("./keyboards/checkout");
const { mainMenuKeyboard } = require("./keyboards/mainMenu");
const { protectCallbackQuery } = require("./utils/callback");

function createBot() {
  const bot = new Telegraf(config.botToken);

  // Global middleware
  bot.use(attachAdminFlag);
  bot.use((ctx, next) => {
    protectCallbackQuery(ctx);
    return next();
  });

  // Register command, menu, catalog, and checkout handlers
  registerStartHandler(bot);
  registerAdminHandler(bot);
  registerCheckoutHandlers(bot);
  registerCatalogHandlers(bot);
  registerMenuHandlers(bot);

  // Intelligent text handler: handles admin wizard, promo codes, customer feedback, checkout, search & fallback
  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    const userId = ctx.from.id;

    // Ignore commands (starts with /)
    if (text.startsWith("/")) {
      return ctx.reply(
        "🤔 Unrecognized command. Use /start to see the main menu, or /admin for store management.",
      );
    }

    // ── 1. Admin Workflow Handlers (Phase 11 & Phase 12) ────────────────────
    if (ctx.state?.isAdmin) {
      const adminSession = db.getAdminSession(userId);

      if (adminSession) {
        if (text.toLowerCase() === "cancel") {
          db.clearAdminSession(userId);
          return ctx.reply("❌ Admin action cancelled.", {
            parse_mode: "Markdown",
          });
        }

        // Add Product Wizard
        if (adminSession.action === "ADD_PRODUCT") {
          if (adminSession.step === "AWAITING_NAME") {
            db.setAdminSession(userId, {
              step: "AWAITING_PRICE",
              draft: { ...adminSession.draft, name: text },
            });
            return ctx.reply(
              `💰 *Step 3 of 4: Price*\n\nSend the price in ${config.currency} for *${text}* (e.g. \`120\`):`,
              { parse_mode: "Markdown" },
            );
          }

          if (adminSession.step === "AWAITING_PRICE") {
            const price = parseFloat(text.replace(/[^0-9.]/g, ""));
            if (isNaN(price) || price <= 0) {
              return ctx.reply(
                `⚠️ Please enter a valid positive number for the price (e.g. \`150\`):`,
              );
            }
            db.setAdminSession(userId, {
              step: "AWAITING_UNIT",
              draft: { ...adminSession.draft, price },
            });
            return ctx.reply(
              `📦 *Step 4 of 4: Unit / Measurement*\n\n` +
                `Send the unit (e.g. \`1 kg\`, \`1 Liter\`, \`1 loaf\`, \`500g bag\`, \`piece\`):`,
              { parse_mode: "Markdown" },
            );
          }

          if (adminSession.step === "AWAITING_UNIT") {
            const unit = text;
            const draft = adminSession.draft;

            // Create product in database
            const created = db.addProduct({
              categoryId: draft.categoryId,
              name: draft.name,
              price: draft.price,
              unit,
              description: `Fresh quality item available at ${config.minimarketName}.`,
              inStock: true,
            });

            db.clearAdminSession(userId);

            return ctx.reply(
              `🎉 *Product Added Successfully!*\n\n` +
                `• *Item:* ${created.name}\n` +
                `• *Price:* ${created.price} ${config.currency} / ${created.unit}\n` +
                `• *Department:* ${created.categoryId}\n` +
                `• *Status:* 🟢 In Stock\n\n` +
                `It is now immediately available for customers in the store catalog!`,
              {
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard([
                  [
                    Markup.button.callback(
                      "➕ Add Another Product",
                      "admin_add_prod_start",
                    ),
                  ],
                  [
                    Markup.button.callback(
                      "⬅️ Back to Admin Menu",
                      "admin_menu_back",
                    ),
                  ],
                ]),
              },
            );
          }
        }

        // Add Promo Code Wizard
        if (adminSession.action === "ADD_PROMO") {
          if (adminSession.step === "AWAITING_CODE") {
            const cleanCode = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            if (!cleanCode) {
              return ctx.reply(
                `⚠️ Please enter a valid promo code string (letters and numbers only):`,
              );
            }
            db.setAdminSession(userId, {
              step: "AWAITING_TYPE",
              draft: { code: cleanCode },
            });
            return ctx.reply(
              `🏷️ *Promo Code: ${cleanCode}*\n\n` +
                `*Step 2 of 4: Discount Type*\n` +
                `Type \`fixed\` for a flat ETB discount (e.g. 50 ETB off)\n` +
                `Or type \`percent\` for a percentage discount (e.g. 10% off):`,
              { parse_mode: "Markdown" },
            );
          }

          if (adminSession.step === "AWAITING_TYPE") {
            const t = text.toLowerCase();
            if (t !== "fixed" && t !== "percent") {
              return ctx.reply(
                `⚠️ Please type either \`fixed\` or \`percent\`:`,
              );
            }
            db.setAdminSession(userId, {
              step: "AWAITING_VALUE",
              draft: { ...adminSession.draft, type: t },
            });
            return ctx.reply(
              `*Step 3 of 4: Discount Value*\n\n` +
                (t === "percent"
                  ? `Enter the percentage value (e.g. \`10\` for 10%):`
                  : `Enter the flat discount amount in ${config.currency} (e.g. \`50\`):`),
              { parse_mode: "Markdown" },
            );
          }

          if (adminSession.step === "AWAITING_VALUE") {
            const val = parseFloat(text.replace(/[^0-9.]/g, ""));
            if (isNaN(val) || val <= 0) {
              return ctx.reply(`⚠️ Please enter a valid positive number:`);
            }
            db.setAdminSession(userId, {
              step: "AWAITING_MIN",
              draft: { ...adminSession.draft, value: val },
            });
            return ctx.reply(
              `*Step 4 of 4: Minimum Order Requirement*\n\n` +
                `Enter minimum order amount in ${config.currency} to qualify (e.g. \`200\`, or \`0\` for no minimum):`,
              { parse_mode: "Markdown" },
            );
          }

          if (adminSession.step === "AWAITING_MIN") {
            const minOrder = parseFloat(text.replace(/[^0-9.]/g, "")) || 0;
            const draft = adminSession.draft;

            const promo = db.createPromoCode({
              code: draft.code,
              type: draft.type,
              value: draft.value,
              minOrder,
              description: `${draft.value}${draft.type === "percent" ? "%" : ` ${config.currency}`} off orders over ${minOrder} ${config.currency}`,
            });

            db.clearAdminSession(userId);

            return ctx.reply(
              `🎉 *Promo Code Created!*\n\n` +
                `• *Code:* \`${promo.code}\`\n` +
                `• *Discount:* ${promo.value}${promo.type === "percent" ? "%" : ` ${config.currency}`}\n` +
                `• *Min Order:* ${promo.minOrder} ${config.currency}\n` +
                `• *Status:* 🟢 Active\n\n` +
                `Customers can now enter \`${promo.code}\` in their cart to receive discounts!`,
              {
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard([
                  [
                    Markup.button.callback(
                      "🏷️ Manage All Promos",
                      "admin_manage_promos",
                    ),
                  ],
                  [
                    Markup.button.callback(
                      "⬅️ Back to Admin Menu",
                      "admin_menu_back",
                    ),
                  ],
                ]),
              },
            );
          }
        }

        // Customer Broadcast
        if (adminSession.action === "BROADCAST") {
          db.clearAdminSession(userId);
          const customerIds = db.getAllCustomerIds();

          ctx.reply(
            `📢 Dispatching announcement to *${customerIds.length}* customer(s)...`,
            { parse_mode: "Markdown" },
          );

          let sentCount = 0;
          for (const targetId of customerIds) {
            try {
              const lang = db.getUserLang(targetId);
              await bot.telegram.sendMessage(
                targetId,
                `📢 *Announcement from ${config.minimarketName}:*\n\n${text}\n\n_Tap 🛍️ Browse Products to see what's fresh today!_`,
                { parse_mode: "Markdown", ...mainMenuKeyboard(lang) },
              );
              sentCount++;
            } catch (err) {
              console.warn(`Failed broadcast to ${targetId}:`, err.message);
            }
          }

          return ctx.reply(
            `✅ *Broadcast Complete!*\nSuccessfully delivered to *${sentCount}* customer(s).`,
            { parse_mode: "Markdown" },
          );
        }

        // Reply to Customer Feedback
        if (
          adminSession.action === "REPLY_CUSTOMER" &&
          adminSession.targetUserId
        ) {
          const targetId = adminSession.targetUserId;
          db.clearAdminSession(userId);

          try {
            const lang = db.getUserLang(targetId);
            await bot.telegram.sendMessage(
              targetId,
              `💬 *Message from ${config.minimarketName} Support:*\n\n"${text}"\n\n_Thank you for shopping with us!_`,
              { parse_mode: "Markdown", ...mainMenuKeyboard(lang) },
            );
            return ctx.reply(
              `✅ *Reply delivered to customer!* (ID: ${targetId})`,
              { parse_mode: "Markdown" },
            );
          } catch (err) {
            return ctx.reply(
              `❌ Could not deliver message to customer (ID: ${targetId}): ${err.message}`,
            );
          }
        }
      }
    }

    // ── 2. Customer Support & Feedback Session (Phase 10) ────────────────────
    const supportSession = db.getSupportSession(userId);
    if (supportSession && supportSession.state === "AWAITING_FEEDBACK") {
      db.clearSupportSession(userId);
      const lang = db.getUserLang(userId);

      ctx.reply(
        lang === "am"
          ? `✅ *አስተያየትዎ ደርሶናል!*\n\nእናመሰግናለን፣ *${ctx.from.first_name || "ውድ ደንበኛችን"}*። መልእክትዎ በቀጥታ ወደ ስራ አስኪያጁ ተላልፏል።\n\nከእኛ ጋር ስለሆኑ እናመሰግናለን!`
          : `✅ *Feedback Received!*\n\nThank you, *${ctx.from.first_name || "Valued Customer"}*. Your message has been forwarded directly to our store manager.\n\nWe appreciate your feedback!`,
        { parse_mode: "Markdown", ...mainMenuKeyboard(lang) },
      );

      // Forward feedback to all store admins
      config.adminIds.forEach((adminId) => {
        bot.telegram
          .sendMessage(
            adminId,
            `📩 *New Customer Feedback Received!*\n\n` +
              `👤 *Customer:* ${ctx.from.first_name || "Customer"} (ID: \`${userId}\`)\n` +
              `💬 *Message:* "${text}"\n\n` +
              `Tap below to reply directly to this customer:`,
            {
              parse_mode: "Markdown",
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback(
                    "💬 Reply to Customer",
                    `admin_reply_${userId}`,
                  ),
                ],
              ]),
            },
          )
          .catch((err) =>
            console.warn(
              `Could not send feedback alert to ${adminId}:`,
              err.message,
            ),
          );
      });

      return;
    }

    // ── 3. Checkout & Promo Conversation Handler ─────────────────────────────
    const checkoutSession = db.getCheckoutSession(userId);
    if (checkoutSession) {
      // Promo Code Validation
      if (checkoutSession.step === "AWAITING_PROMO") {
        if (text.toLowerCase() === "cancel") {
          db.setCheckoutSession(userId, { step: null });
          return renderCart(ctx);
        }

        const cart = db.getCart(userId);
        const validation = db.validatePromoCode(userId, text, cart.total);
        const lang = db.getUserLang(userId);

        if (!validation.valid) {
          return ctx.reply(
            `⚠️ ${validation.message}\n\n` +
              (lang === "am"
                ? `እባክዎ ትክክለኛ የኩፖን ኮድ ያስገቡ ወይም ለመሰረዝ "cancel" ብለው ይጻፉ፡`
                : `Please enter a valid code or type "cancel" to return:`),
            { parse_mode: "Markdown" },
          );
        }

        // Apply promo code discount to session
        db.setCheckoutSession(userId, {
          step: null,
          appliedPromo: {
            code: validation.promo.code,
            discount: validation.discount,
          },
        });

        await ctx.reply(validation.message, { parse_mode: "Markdown" });
        return renderCart(ctx);
      }

      if (checkoutSession.step === "AWAITING_ADDRESS") {
        const savedProfile = db.getUserProfile(userId);
        let address = text;
        if (
          (text.toLowerCase() === "same" || text.toLowerCase() === "reuse") &&
          savedProfile?.address
        ) {
          address = savedProfile.address;
        }

        db.setCheckoutSession(userId, {
          step: "AWAITING_PHONE",
          address,
        });

        const lang = db.getUserLang(userId);
        const prompt =
          lang === "am"
            ? `✅ አድራሻ ተመዝግቧል፡ *${address}*\n\n` +
              `📱 *ደረጃ 2 ከ 3፡ ስልክ ቁጥር*\n\n` +
              `እባክዎ አሽከርካሪያችን የሚደውልበትን ስልክ ቁጥር ይጻፉ ወይም ያጋሩ፡`
            : `✅ Address set: *${address}*\n\n` +
              `📱 *Step 2 of 3: Phone Number*\n\n` +
              `Please share or type your contact phone number:`;

        return ctx.reply(prompt, {
          parse_mode: "Markdown",
          ...shareContactKeyboard(),
        });
      }

      if (checkoutSession.step === "AWAITING_PHONE") {
        const savedProfile = db.getUserProfile(userId);
        let phone = text;
        if (
          (text.toLowerCase() === "same" || text.toLowerCase() === "reuse") &&
          savedProfile?.phone
        ) {
          phone = savedProfile.phone;
        }

        return proceedToPaymentStep(ctx, userId, phone);
      }
    }

    // ── 4. Intelligent Product Search ───────────────────────────────────────
    const matches = db.searchProducts(text);
    const lang = db.getUserLang(userId);

    if (matches.length > 0) {
      return ctx.reply(
        lang === "am"
          ? `🔎 *ለ "${text}" የተገኙ ${matches.length} እቃዎች:*\n\nዝርዝሩን ለማየት እቃውን ይጫኑ፡`
          : `🔎 *Found ${matches.length} item(s) matching "${text}":*\n\nTap an item to view or add to cart:`,
        {
          parse_mode: "Markdown",
          ...searchResultsKeyboard(matches, config.currency, lang),
        },
      );
    }

    // ── 5. Fallback ─────────────────────────────────────────────────────────
    return ctx.reply(
      lang === "am"
        ? `🤔 በ "*${text}*" የተገኘ እቃ የለም።\n\n` +
            `💡 *ጠቃሚ ምክር፡* እንደ *ሙዝ*, *ዘይት*, *ዳቦ*, *ወተት* የመሳሰሉ ቃላትን ይፈልጉ ወይም *🛍️ እቃዎችን ይመልከቱ* የሚለውን ይጫኑ።`
        : `🤔 No items found matching "*${text}*".\n\n` +
            `💡 *Suggestions:* Try searching for *Milk*, *Oil*, *Bread*, *Banana*, or tap *🛍️ Browse Products* to see all departments.`,
      { parse_mode: "Markdown" },
    );
  });

  return bot;
}

module.exports = { createBot };
