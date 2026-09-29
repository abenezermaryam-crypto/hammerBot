const config = require("../../config/env");
const db = require("../../database");
const {
  mainMenuKeyboard,
  languageSelectKeyboard,
  helpSupportInlineKeyboard,
  emptyCartKeyboard,
} = require("../keyboards/mainMenu");
const { renderCart } = require("./catalog");
const { searchResultsKeyboard } = require("../keyboards/catalog");
const { formatOrderStatus } = require("./checkout");
const { orderTrackingKeyboard } = require("../keyboards/checkout");
const { answerCallbackQuery } = require("../utils/callback");
const { escapeMarkdown } = require("../utils/markdown");
const { t } = require("../../i18n");
const { Markup } = require("telegraf");

function registerMenuHandlers(bot) {
  // ── 0. Language Switcher ──────────────────────────────────────────────────
  bot.hears(["🌐 ቋንቋ / Language", "Language", "ቋንቋ"], (ctx) => {
    const lang = db.getUserLang(ctx.from.id);
    const text =
      lang === "am"
        ? `🌐 *የቋንቋ ምርጫ / Select Language*\n\nእባክዎ የሚፈልጉትን ቋንቋ ይምረጡ፡`
        : `🌐 *Language Selection / የቋንቋ ምርጫ*\n\nPlease choose your preferred language:`;

    return ctx.reply(text, {
      parse_mode: "Markdown",
      ...languageSelectKeyboard(),
    });
  });

  bot.action("set_lang_en", (ctx) => {
    answerCallbackQuery(ctx);
    const userId = ctx.from.id;
    db.setUserLang(userId, "en");
    return ctx.reply(
      `🇺🇸 *Language set to English!*\n\nWelcome to *${config.minimarketName}*. How can we serve you today?`,
      {
        parse_mode: "Markdown",
        ...mainMenuKeyboard("en"),
      },
    );
  });

  bot.action("set_lang_am", (ctx) => {
    answerCallbackQuery(ctx);
    const userId = ctx.from.id;
    db.setUserLang(userId, "am");
    return ctx.reply(
      `🇪🇹 *ቋንቋዎ በተሳካ ሁኔታ ወደ አማርኛ ተቀይሯል!*\n\nእንኳን ወደ *${config.minimarketName}* በደህና መጡ። ዛሬ ምን ማዘዝ ይፈልጋሉ?`,
      {
        parse_mode: "Markdown",
        ...mainMenuKeyboard("am"),
      },
    );
  });

  // ── 1. Shopping Cart (English & Amharic) ──────────────────────────────────
  bot.hears(["🛒 My Cart", "🛒 Cart", "🛒 የእኔ ጋሪ"], (ctx) => {
    return renderCart(ctx);
  });

  // Helper for rendering orders
  const renderUserOrders = (ctx) => {
    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    const orders = db.getUserOrders(userId);

    if (orders.length === 0) {
      return ctx.reply(
        `📦 *${t(lang, "my_orders_title")}*\n\n` + `${t(lang, "no_orders")}`,
        {
          parse_mode: "Markdown",
          ...emptyCartKeyboard(lang),
        },
      );
    }

    const latest = orders[0];
    const { label, bar } = formatOrderStatus(latest.status);

    let text =
      `📦 *${escapeMarkdown(t(lang, "my_orders_title"))}* (${orders.length} total)\n\n` +
      `*Latest Order: #${latest.id}*\n` +
      `📊 *${escapeMarkdown(t(lang, "order_status"))}:* ${escapeMarkdown(label)}\n` +
      `${escapeMarkdown(bar)}\n\n` +
      `💰 *Total:* ${latest.total} ${config.currency} (${escapeMarkdown(latest.paymentMethod)})\n`;

    if (latest.discount > 0) {
      text += `🏷️ *Promo Discount:* -${latest.discount} ${config.currency} (${escapeMarkdown(latest.promoCode || "")})\n`;
    }

    text +=
      `📍 *Deliver to:* ${escapeMarkdown(latest.deliveryAddress)}\n` +
      `🕒 *${escapeMarkdown(t(lang, "placed_at"))}:* ${new Date(latest.createdAt).toLocaleDateString()} ${new Date(latest.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}\n\n` +
      `*Items in this order:*\n`;

    latest.items.forEach((item) => {
      text += `• ${escapeMarkdown(item.product.name)} × ${item.quantity}\n`;
    });

    if (orders.length > 1) {
      text += `\n*Past Orders:*\n`;
      orders.slice(1, 5).forEach((past) => {
        text += `• *#${past.id}* — ${past.total} ${config.currency} (${escapeMarkdown(past.status)})\n`;
      });
    }

    return ctx.reply(text, {
      parse_mode: "Markdown",
      ...orderTrackingKeyboard(latest.id),
    });
  };

  // ── 2. Orders & Tracking ──────────────────────────────────────────────────
  bot.hears(["📦 My Orders", "📦 Orders", "📦 ትዕዛዞቼ"], (ctx) => {
    return renderUserOrders(ctx);
  });

  // Backwards compatibility for previous "Track Delivery" button
  bot.hears(["🚚 Track Delivery", "🚚 Delivery", "የጉዞ ሁኔታ"], (ctx) => {
    return renderUserOrders(ctx);
  });

  // ── 3. Favorites / Wishlist ───────────────────────────────────────────────
  bot.hears(["❤️ Favorites", "❤️ Wishlist", "❤️ ተወዳጆች"], (ctx) => {
    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    const favs = db.getFavorites(userId);

    if (favs.length === 0) {
      return ctx.reply(
        lang === "am"
          ? `❤️ *ተወዳጅ እቃዎች*\n\nእስካሁን ምንም ተወዳጅ እቃ አላስቀመጡም።\nበማንኛውም እቃ ላይ *🤍 ወደ ተወዳጆች* የሚለውን በመጫን ለቀጣይ ፈጣን ግብይት እዚህ ያስቀምጡ!`
          : `❤️ *Favorite Products*\n\nYou haven't saved any favorite items yet.\n\nTap the *🤍 Add to Favorites* button on any product card to save items here for fast reordering!`,
        {
          parse_mode: "Markdown",
          ...emptyCartKeyboard(lang),
        },
      );
    }

    let text =
      lang === "am"
        ? `❤️ *የተቀመጡ ተወዳጆች* (${favs.length} እቃዎች)\n\n`
        : `❤️ *Your Saved Favorites* (${favs.length} items)\n\n`;

    favs.forEach((prod, i) => {
      text += `${i + 1}. *${prod.name}* — ${prod.price} ${config.currency} / ${prod.unit}\n`;
    });
    text +=
      lang === "am"
        ? `\nእቃዎችን ለመመልከት ወይም ወደ ጋሪ ለመጨመር ከታች ይምረጡ፡`
        : `\nSelect an item below to view or add to cart:`;

    return ctx.reply(text, {
      parse_mode: "Markdown",
      ...searchResultsKeyboard(favs, config.currency, lang),
    });
  });

  // ── 4. Search Products ────────────────────────────────────────────────────
  bot.hears(["🔎 Search Products", "🔎 Search", "🔎 እቃ ይፈልጉ"], (ctx) => {
    const lang = db.getUserLang(ctx.from.id);
    ctx.reply(
      lang === "am"
        ? `🔎 *እቃዎችን በስም ይፈልጉ*\n\nየሚፈልጉትን እቃ ስም ይጻፉ (ለምሳሌ፡ *ሙዝ*, *ወተት*, *ዘይት*, *ውሃ*, *ዳቦ*):`
        : `🔎 *Search Products in ${config.minimarketName}*\n\nType the name of any grocery or item you want (e.g. *Banana*, *Milk*, *Oil*, *Water*, *Bread*):`,
      { parse_mode: "Markdown" },
    );
  });

  // ── 5. Help & Support ─────────────────────────────────────────────────────
  bot.hears(
    ["💬 Help & Support", "Help & Support", "Help", "💬 እርዳታ እና ድጋፍ"],
    (ctx) => {
      const lang = db.getUserLang(ctx.from.id);
      ctx.reply(
        lang === "am"
          ? `💬 *እርዳታ እና የደንበኞች ድጋፍ*\n\nእንዴት ልንረዳዎ እንችላለን?\n\n📍 *አድራሻ:* ${config.storeLocation}\n🕒 *የስራ ሰዓት:* ${config.storeHours}\n📞 *ስልክ:* ${config.supportPhone}\n\nከታች ካሉት አማራጮች አንዱን ይምረጡ፡`
          : `💬 *Help & Customer Support*\n\nHow can we assist you today?\n\n📍 *Location:* ${config.storeLocation}\n🕒 *Working Hours:* ${config.storeHours}\n📞 *Phone:* ${config.supportPhone}\n\nSelect an option below:`,
        {
          parse_mode: "Markdown",
          ...helpSupportInlineKeyboard(
            config.supportUsername,
            config.supportPhone,
            lang,
          ),
        },
      );
    },
  );

  // Backwards compatibility for previous "Feedback" and "Contact Us" buttons
  bot.hears(["💬 Feedback", "Feedback"], (ctx) => {
    const lang = db.getUserLang(ctx.from.id);
    ctx.reply(
      lang === "am"
        ? `✍️ *የደንበኞች አስተያየት*\n\nአስተያየትዎን ወይም ጥያቄዎን ይጻፉልን፤ ቡድናችን በጥንቃቄ ይመለከተዋል!`
        : `✍️ *Customer Feedback*\n\nWe'd love to hear your thoughts! Please reply with your suggestions or feedback, and our team will review it.`,
      { parse_mode: "Markdown" },
    );
  });

  bot.hears(["📞 Contact Us", "Contact Us"], (ctx) => {
    ctx.reply(
      `📞 *Contact Minimarket Support*\n\n` +
        `📍 *Store:* ${config.storeLocation}\n` +
        `🕒 *Hours:* ${config.storeHours}\n` +
        `📱 *Phone / WhatsApp:* ${config.supportPhone}\n\n` +
        `Our team is happy to help you with orders, delivery, and inquiries!`,
      { parse_mode: "Markdown" },
    );
  });

  // Support Inline Button Actions
  bot.action("support_store_info", (ctx) => {
    answerCallbackQuery(ctx);
    ctx.reply(
      `🏪 *Store Information — ${config.minimarketName}*\n\n` +
        `📍 *Address:* ${config.storeLocation}\n` +
        `🕒 *Hours:* ${config.storeHours}\n` +
        `📞 *Customer Line:* ${config.supportPhone}\n` +
        (config.supportUsername
          ? `💬 *Telegram:* ${config.supportUsername}\n`
          : ""),
      { parse_mode: "Markdown" },
    );
  });

  bot.action("support_feedback", (ctx) => {
    answerCallbackQuery(ctx);
    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    db.setSupportSession(userId, { state: "AWAITING_FEEDBACK" });
    ctx.reply(
      lang === "am"
        ? `✍️ *አስተያየት ወይም ጥያቄ ይላኩ*\n\nእባክዎ መልእክትዎን ከዚህ በታች ይጻፉ። መልእክትዎ በቀጥታ ወደ *${config.minimarketName}* ስራ አስኪያጅ ይላካል።`
        : `✍️ *Send Us Your Feedback or Question*\n\nPlease type your message below. It will be sent directly to the store manager at *${config.minimarketName}*.\n\nWe read and respond to every message!`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              lang === "am" ? "❌ ሰርዝ" : "❌ Cancel",
              "cancel_feedback",
            ),
          ],
        ]),
      },
    );
  });

  bot.action("cancel_feedback", (ctx) => {
    answerCallbackQuery(ctx);
    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    db.clearSupportSession(userId);
    ctx.reply(
      lang === "am" ? "ተሰርዟል።" : "Feedback cancelled.",
      mainMenuKeyboard(lang),
    );
  });

  bot.action("support_faq", (ctx) => {
    answerCallbackQuery(ctx);
    const lang = db.getUserLang(ctx.from.id);
    ctx.reply(
      lang === "am"
        ? `❓ *ተደጋጋሚ ጥያቄዎች*\n\nእባክዎ ርዕስ ይምረጡ፡`
        : `❓ *Frequently Asked Questions*\n\nSelect a topic below:`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              lang === "am"
                ? "🛵 የማድረሻ ሰዓት እና ሽፋን"
                : "🛵 Delivery Time & Coverage",
              "faq_delivery",
            ),
          ],
          [
            Markup.button.callback(
              lang === "am"
                ? "💳 የክፍያ ዘዴዎች (ቴሌብር እና ሲቢኢ)"
                : "💳 Payment Methods (Telebirr & CBE)",
              "faq_payments",
            ),
          ],
          [
            Markup.button.callback(
              lang === "am"
                ? "📍 የሱቁ አድራሻ እና ሰዓት"
                : "📍 Store Location & Hours",
              "faq_location",
            ),
          ],
          [
            Markup.button.callback(
              lang === "am"
                ? "🔄 ትዕዛዝ መሰረዝ እና ቅያሪ"
                : "🔄 Returns & Cancellations",
              "faq_returns",
            ),
          ],
        ]),
      },
    );
  });

  bot.action("faq_delivery", (ctx) => {
    answerCallbackQuery(ctx);
    const lang = db.getUserLang(ctx.from.id);
    ctx.reply(
      lang === "am"
        ? `🛵 *የማድረሻ መረጃ፡*\n\n• *ፍጥነት፡* በሃዋሳ ከተማ ውስጥ ትዕዛዞች በ *30 እስከ 45 ደቂቃ* ይደርሳሉ።\n• *ዋጋ፡* የማድረሻ ዋጋ *50 ${config.currency}* ነው።\n• *መከታተያ፡* የአሽከርካሪውን ጉዞ በ *📦 ትዕዛዞቼ* መከታተል ይችላሉ።`
        : `🛵 *Delivery Information:*\n\n• *Speed:* Orders typically arrive in *30 to 45 minutes* across Hawassa.\n• *Cost:* Flat delivery fee of *50 ${config.currency}*.\n• *Tracking:* Track your delivery driver live in *📦 My Orders*.`,
      { parse_mode: "Markdown" },
    );
  });

  bot.action("faq_payments", (ctx) => {
    answerCallbackQuery(ctx);
    const lang = db.getUserLang(ctx.from.id);
    ctx.reply(
      lang === "am"
        ? `💳 *ተቀባይነት ያላቸው የክፍያ ዘዴዎች፡*\n\n• *እቃው ሲደርስ (COD)፡* ለአሽከርካሪው በጥሬ ገንዘብ ይክፈሉ።\n• *በቴሌብር (Telebirr)፡* ወደ \`${config.telebirrPhone}\` (${config.telebirrName}) ይላኩ ወይም 127# ይደውሉ።\n• *በሲቢኢ ብር / CBE SuperApp፡* ወደ \`${config.cbeAccount}\` (${config.cbeName}) ያስተላልፉ ወይም 847# / 889# ይጠቀሙ።\n\nየክፍያ ማረጋገጫ ፎቶውን ሲልኩልን ወዲያውኑ ይረጋገጣል!`
        : `💳 *Accepted Payment Methods:*\n\n• *Cash on Delivery (COD):* Pay cash to the delivery driver.\n• *Telebirr:* Transfer to \`${config.telebirrPhone}\` (${config.telebirrName}) or dial 127#.\n• *CBE Birr / CBE SuperApp:* Transfer to \`${config.cbeAccount}\` (${config.cbeName}) or dial 847# / 889#.\n\nUpload your payment confirmation screenshot and your order is confirmed immediately!`,
      { parse_mode: "Markdown" },
    );
  });

  bot.action("faq_location", (ctx) => {
    answerCallbackQuery(ctx);
    const lang = db.getUserLang(ctx.from.id);
    ctx.reply(
      lang === "am"
        ? `📍 *የሱቁ አድራሻ እና የስራ ሰዓት፡*\n\n• *አድራሻ:* ${config.storeLocation}\n• *የስራ ሰዓት:* ${config.storeHours}\n• *ስልክ / ዋትስአፕ:* ${config.supportPhone}`
        : `📍 *Store Location & Hours:*\n\n• *Location:* ${config.storeLocation}\n• *Operating Hours:* ${config.storeHours}\n• *Phone / WhatsApp:* ${config.supportPhone}`,
      { parse_mode: "Markdown" },
    );
  });

  bot.action("faq_returns", (ctx) => {
    answerCallbackQuery(ctx);
    const lang = db.getUserLang(ctx.from.id);
    ctx.reply(
      lang === "am"
        ? `🔄 *ትዕዛዝ መሰረዝ እና ቅያሪ፡*\n\n• እቃው ከአቅራቢው ከመውጣቱ በፊት በማንኛውም ሰዓት በ *📦 ትዕዛዞቼ* ወይም በመደወል መሰረዝ ይችላሉ።\n• ማንኛውም እቃ ላይ ጉድለት ቢኖር ወዲያውኑ ያለምንም ተጨማሪ ክፍያ እንቀይራለን ወይም ገንዘብዎን እንመልሳለን!`
        : `🔄 *Returns & Order Changes:*\n\n• Orders can be cancelled anytime before dispatch from *📦 My Orders* or by calling our hotline.\n• If any item arrives damaged or missing, we provide an immediate free replacement or refund!`,
      { parse_mode: "Markdown" },
    );
  });
}

module.exports = { registerMenuHandlers };
