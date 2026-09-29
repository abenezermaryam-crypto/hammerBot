const config = require("../../config/env");
const db = require("../../database");
const {
  checkoutPaymentKeyboard,
  checkoutConfirmationKeyboard,
  shareContactKeyboard,
  shareLocationKeyboard,
  telebirrPaymentKeyboard,
  cbePaymentKeyboard,
  awaitingReceiptKeyboard,
  paymentVerificationKeyboard,
  orderTrackingKeyboard,
  adminOrderActionsKeyboard,
} = require("../keyboards/checkout");
const { mainMenuKeyboard } = require("../keyboards/mainMenu");
const { answerCallbackQuery } = require("../utils/callback");
const {
  createPaymentSession,
  verifyPayment,
} = require("../../services/payment");

const DELIVERY_FEE = 50; // 50 ETB standard delivery

// ─── Order Status Helpers ─────────────────────────────────────────────────────

function formatOrderStatus(status) {
  switch (status) {
    case "pending":
      return {
        label: "🟡 Order Received — Awaiting Confirmation",
        bar: "⏳ [ 🟡 Received  ➔  ⚪ Confirmed  ➔  ⚪ In Transit  ➔  ⚪ Delivered ]",
      };
    case "awaiting_payment":
      return {
        label: "💳 Awaiting Payment Verification",
        bar: "🔍 [ 🟡 Received  ➔  💳 Verifying Payment  ➔  ⚪ In Transit  ➔  ⚪ Delivered ]",
      };
    case "confirmed":
      return {
        label: "🟢 Order Confirmed by Store",
        bar: "📋 [ 🟢 Received  ➔  🟢 Confirmed  ➔  ⚪ In Transit  ➔  ⚪ Delivered ]",
      };
    case "preparing":
      return {
        label: "👨‍🍳 Packing & Preparing Your Items",
        bar: "📦 [ 🟢 Received  ➔  🟢 Confirmed  ➔  🟡 Packing  ➔  ⚪ Delivered ]",
      };
    case "out_for_delivery":
      return {
        label: "🛵 Out for Delivery — Driver on the Way!",
        bar: "🚀 [ 🟢 Received  ➔  🟢 Confirmed  ➔  🟢 Packed  ➔  🟡 On The Way ]",
      };
    case "delivered":
      return {
        label: "✅ Successfully Delivered",
        bar: "🎉 [ 🟢 Received  ➔  🟢 Confirmed  ➔  🟢 Packed  ➔  🟢 Delivered ]",
      };
    case "payment_rejected":
      return {
        label: "❌ Payment Rejected — Please Retry",
        bar: "🚫 [ Payment Not Verified — Contact Store ]",
      };
    case "cancelled":
      return {
        label: "❌ Order Cancelled",
        bar: "🚫 [ Order Cancelled ]",
      };
    default:
      return { label: status, bar: "" };
  }
}

// ─── Payment Instructions Builders ───────────────────────────────────────────

function buildTelebirrInstructions(total) {
  return (
    `📱 *Telebirr Payment Instructions*\n\n` +
    `Please transfer *${total} ${config.currency}* to:\n\n` +
    `📞 *Telebirr Number:* \`${config.telebirrPhone}\` _(Tap to copy)_\n` +
    `👤 *Account Name:* ${config.telebirrName}\n\n` +
    `*How to Pay:*\n` +
    `1️⃣ Tap the phone number above to copy it: \`${config.telebirrPhone}\`\n` +
    `2️⃣ Tap *📱 Open Telebirr App ↗️* below to launch Telebirr\n` +
    `   _(Or dial 127# on your phone)_\n` +
    `3️⃣ Send exactly: *${total} ${config.currency}*\n` +
    `4️⃣ Take a screenshot of the completed transfer\n\n` +
    `📸 *Upload your screenshot here* — our team will verify it immediately and dispatch your order!`
  );
}

function buildCBEInstructions(total) {
  return (
    `🏦 *Bank Transfer Instructions*\n\n` +
    `Please transfer *${total} ${config.currency}* to:\n\n` +
    `🏦 *Bank:* Commercial Bank of Ethiopia (CBE)\n` +
    `💳 *Account Number:* \`${config.cbeAccount}\` _(Tap to copy)_\n` +
    `👤 *Account Name:* ${config.cbeName}\n\n` +
    `*How to Pay:*\n` +
    `1️⃣ Tap the account number above to copy it: \`${config.cbeAccount}\`\n` +
    `2️⃣ Pay from your bank app, branch, or mobile banking (for CBE, dial 847# or 889# if needed)\n` +
    `3️⃣ Transfer exactly: *${total} ${config.currency}*\n` +
    `4️⃣ Reply with the bank name you used, then upload a screenshot of the transfer confirmation\n\n` +
    `📸 *Upload your screenshot here* — our team will verify it immediately and dispatch your order!`
  );
}

// ─── Main Handler Registration ────────────────────────────────────────────────

function registerCheckoutHandlers(bot) {
  // ── Start checkout from Cart (💳 Proceed to Checkout button) ──────────────
  bot.action("checkout_prompt", (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id;
    const cart = db.getCart(userId);

    if (cart.items.length === 0) {
      return ctx.reply("🛒 Your cart is empty. Add some items first!");
    }

    const savedProfile = db.getUserProfile(userId);
    const existingSession = db.getCheckoutSession(userId);
    const appliedPromo = existingSession?.appliedPromo || null;
    const lang = db.getUserLang(userId);

    let discount = 0;
    if (appliedPromo) {
      discount = appliedPromo.discount;
    }
    const total = Math.max(0, cart.total - discount + DELIVERY_FEE);

    db.setCheckoutSession(userId, {
      step: "AWAITING_ADDRESS",
      cartItems: cart.items,
      subtotal: cart.total,
      deliveryFee: DELIVERY_FEE,
      discount,
      promoCode: appliedPromo ? appliedPromo.code : null,
      total,
    });

    let prompt =
      lang === "am"
        ? `🛍️ *ግብይት ማጠናቀቅ ጀምረዋል!*\n\n` +
          `📍 *ደረጃ 1 ከ 3፡ የማድረሻ አድራሻ*\n\n` +
          `እቃው የት እንዲደርስ ይፈልጋሉ?\n\n` +
          `• የሰፈርዎን ወይም የህንጻ ስም ይጻፉ (ለምሳሌ፡ ታቦር፣ ሪፈራል፣ ፒያሳ)\n` +
          `• ወይም ከታች ያለውን ቁልፍ በመንካት የጂፒኤስ (GPS) ካርታ ይላኩ`
        : `🛍️ *Checkout Started!*\n\n` +
          `📍 *Step 1 of 3: Delivery Address*\n\n` +
          `Where should we deliver your order?\n\n` +
          `• Type your neighborhood, street or building name\n` +
          `  _(e.g. Hawassa Tabor, near Commercial Bank)_\n` +
          `• Or tap the button below to share your exact GPS location`;

    if (savedProfile?.address) {
      prompt +=
        lang === "am"
          ? `\n\n_💡 የቀደመ አድራሻ፡ "${savedProfile.address}"_\n_እንደገና ለመጠቀም *same* ብለው ይጻፉ።_`
          : `\n\n_💡 Previous address: "${savedProfile.address}"_\n_Type *same* to reuse it._`;
    }

    return ctx.reply(prompt, {
      parse_mode: "Markdown",
      ...shareLocationKeyboard(),
    });
  });

  // ── Cancel Checkout ────────────────────────────────────────────────────────
  bot.hears(["❌ Cancel Checkout", "Cancel Checkout"], (ctx) => {
    db.clearCheckoutSession(ctx.from.id);
    return ctx.reply(
      "❌ *Checkout cancelled.*\nYour cart items are safely saved — come back anytime!",
      { parse_mode: "Markdown", ...mainMenuKeyboard() },
    );
  });

  bot.action("checkout_cancel", (ctx) => {
    ctx.answerCbQuery("Checkout cancelled");
    db.clearCheckoutSession(ctx.from.id);
    return ctx.reply(
      "❌ *Checkout cancelled.*\nYour cart items are safely saved — come back anytime!",
      { parse_mode: "Markdown", ...mainMenuKeyboard() },
    );
  });

  // ── Change Payment Method (back to payment selection) ─────────────────────
  bot.action("checkout_change_payment", (ctx) => {
    ctx.answerCbQuery();
    const session = db.getCheckoutSession(ctx.from.id);
    if (!session) {
      return ctx.reply("⚠️ Session expired. Please start from your cart.");
    }
    db.setCheckoutSession(ctx.from.id, { step: "AWAITING_PAYMENT" });
    return ctx.reply(`💳 *Choose a Different Payment Method:*`, {
      parse_mode: "Markdown",
      ...checkoutPaymentKeyboard(),
    });
  });

  // ── GPS Location Handler (Step 1 → Step 2) ────────────────────────────────
  bot.on("location", (ctx) => {
    const userId = ctx.from.id;
    const session = db.getCheckoutSession(userId);
    if (!session || session.step !== "AWAITING_ADDRESS") return;

    const { latitude, longitude } = ctx.message.location;
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const address = `📍 GPS Pin: ${mapsLink}`;

    db.setCheckoutSession(userId, { step: "AWAITING_PHONE", address });

    const savedProfile = db.getUserProfile(userId);
    let phonePrompt =
      `✅ *Location received!*\n\n` +
      `📱 *Step 2 of 3: Phone Number*\n\n` +
      `Please share your phone number so our driver can reach you:`;

    if (savedProfile?.phone) {
      phonePrompt += `\n\n_💡 Previous phone: ${savedProfile.phone} — type *same* to reuse._`;
    }

    return ctx.reply(phonePrompt, {
      parse_mode: "Markdown",
      ...shareContactKeyboard(),
    });
  });

  // ── Telegram Contact Share Handler (Step 2 → Step 3) ─────────────────────
  bot.on("contact", (ctx) => {
    const userId = ctx.from.id;
    const session = db.getCheckoutSession(userId);
    if (!session || session.step !== "AWAITING_PHONE") return;

    const phone = ctx.message.contact.phone_number;
    return proceedToPaymentStep(ctx, userId, phone);
  });

  // ── Payment Method Selected ────────────────────────────────────────────────
  bot.action(/^pay_(cod|telebirr|cbe)$/, (ctx) => {
    const methodKey = ctx.match[1];
    const userId = ctx.from.id;
    const session = db.getCheckoutSession(userId);

    if (!session) {
      ctx.answerCbQuery("⚠️ Session expired. Please start from your cart.");
      return;
    }

    ctx.answerCbQuery();

    const paymentMethodMap = {
      cod: "Cash on Delivery",
      telebirr: "Telebirr",
      cbe: "Bank Transfer",
    };
    const paymentMethod = paymentMethodMap[methodKey];

    db.setCheckoutSession(userId, {
      step: "AWAITING_CONFIRMATION",
      paymentMethod,
    });

    const updatedSession = db.getCheckoutSession(userId);

    // Build order review summary
    let review =
      `📋 *Order Review — Please Confirm*\n\n` +
      `👤 *Customer:* ${ctx.from.first_name || "Customer"}\n` +
      `📍 *Deliver to:* ${updatedSession.address}\n` +
      `📱 *Phone:* ${updatedSession.phone}\n` +
      `💳 *Payment:* *${paymentMethod}*\n\n` +
      `*🧺 Items Ordered:*\n`;

    updatedSession.cartItems.forEach((item, i) => {
      review += `  ${i + 1}. ${item.product.name} × ${item.quantity} = ${item.itemTotal} ${config.currency}\n`;
    });

    review +=
      `\n─────────────────────────\n` +
      `🧾 Subtotal:      ${updatedSession.subtotal} ${config.currency}\n` +
      `🛵 Delivery Fee:  ${updatedSession.deliveryFee} ${config.currency}\n`;

    if (updatedSession.discount > 0) {
      review += `🏷️ Promo (${updatedSession.promoCode}): -${updatedSession.discount} ${config.currency}\n`;
    }

    review +=
      `💰 *Grand Total:  ${updatedSession.total} ${config.currency}*\n` +
      `─────────────────────────\n\n` +
      `Please review and confirm to place your order.`;

    return ctx
      .editMessageText(review, {
        parse_mode: "Markdown",
        ...checkoutConfirmationKeyboard(paymentMethod),
      })
      .catch(() =>
        ctx.reply(review, {
          parse_mode: "Markdown",
          ...checkoutConfirmationKeyboard(paymentMethod),
        }),
      );
  });

  // ── Final Order Confirmation ───────────────────────────────────────────────
  bot.action("checkout_confirm_order", async (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id;
    const session = db.getCheckoutSession(userId);

    if (!session || !session.cartItems) {
      return ctx.reply(
        "⚠️ No active order session. Please start from your cart again.",
      );
    }

    // Create the order in the database
    const order = db.createOrder({
      userId,
      customerName: ctx.from.first_name || "Customer",
      phone: session.phone,
      deliveryAddress: session.address,
      items: session.cartItems,
      subtotal: session.subtotal,
      deliveryFee: session.deliveryFee,
      discount: session.discount || 0,
      promoCode: session.promoCode || null,
      total: session.total,
      paymentMethod: session.paymentMethod,
    });

    // Clear cart & session immediately
    db.clearCart(userId);
    db.clearCheckoutSession(userId);

    // ── Cash on Delivery: confirm immediately ──────────────────────────────
    if (order.paymentMethod === "Cash on Delivery") {
      const msg =
        `🎉 *Order Placed Successfully!*\n\n` +
        `📦 *Order ID:* #${order.id}\n` +
        `💵 *Amount Due:* ${order.total} ${config.currency} *(Pay Cash on Delivery)*\n` +
        `📍 *Deliver to:* ${order.deliveryAddress}\n` +
        `⏱️ *Estimated Delivery:* 30 – 45 minutes\n\n` +
        `Our team has been notified and will confirm your order shortly!`;

      ctx.reply(msg, { parse_mode: "Markdown", ...mainMenuKeyboard() });
      ctx.reply(`📦 *Track Your Order #${order.id}:*`, {
        parse_mode: "Markdown",
        ...orderTrackingKeyboard(order.id),
      });

      notifyAdminsOfNewOrder(bot, order);
      return;
    }

    // ── Telebirr / CBE: create a provider payment session if available ────
    const providerResult = await createPaymentSession(order);
    order.paymentReference = providerResult.reference;
    order.paymentProviderStatus = providerResult.status || "PENDING";
    db.save();

    db.updateOrderStatus(order.id, "awaiting_payment");

    let instructions = "";
    let paymentKeyboard = null;
    if (order.paymentMethod === "Telebirr") {
      instructions = buildTelebirrInstructions(order.total);
      paymentKeyboard = telebirrPaymentKeyboard(order.id);
    } else {
      instructions = buildCBEInstructions(order.total);
      paymentKeyboard = cbePaymentKeyboard(order.id);
    }

    if (
      providerResult.enabled &&
      providerResult.autoConfirm &&
      providerResult.status === "SUCCESS"
    ) {
      order.paymentProviderStatus = "SUCCESS";
      db.updateOrderStatus(order.id, "confirmed");
      db.save();
      ctx.reply(
        `✅ *Payment Confirmed Automatically*\n\n` +
          `📦 *Order #${order.id}* has been confirmed successfully.\n` +
          `💳 *Provider Reference:* ${order.paymentReference}\n\n` +
          `Your groceries are being prepared for delivery!`,
        { parse_mode: "Markdown", ...orderTrackingKeyboard(order.id) },
      );
      notifyAdminsOfNewOrder(bot, order);
      return;
    }

    // Store orderId in a new session so we can match the incoming photo
    const paymentSessionStep =
      order.paymentMethod === "Bank Transfer"
        ? "AWAITING_BANK_NAME"
        : "AWAITING_RECEIPT";

    db.setCheckoutSession(userId, {
      step: paymentSessionStep,
      pendingOrderId: order.id,
      bankName: null,
    });

    const providerMessage = providerResult.enabled
      ? `\n\n🔐 *Provider verification is active.* Reference: \`${order.paymentReference}\``
      : "\n\n⚠️ No official provider API is configured yet. Please upload a payment screenshot for manual verification.";

    const userPrompt =
      order.paymentMethod === "Bank Transfer"
        ? `📦 *Order #${order.id} Registered!*\n\n` +
          `Please type the bank name you used for the transfer, then send the payment screenshot.${providerMessage}\n` +
          `Your cart has been cleared and items are reserved for you.`
        : `📦 *Order #${order.id} Registered!*\n\n` +
          `Complete your payment using the instructions below.${providerMessage}\n` +
          `Your cart has been cleared and items are reserved for you.`;

    ctx.reply(userPrompt, {
      parse_mode: "Markdown",
      ...mainMenuKeyboard(),
    });

    ctx.reply(instructions, {
      parse_mode: "Markdown",
      ...paymentKeyboard,
    });

    notifyAdminsOfNewOrder(bot, order);
  });

  // ── Payment Screenshot / Receipt Upload ───────────────────────────────────
  function handleReceiptUpload(ctx, fileId, isPhoto) {
    const userId = ctx.from.id;
    const session = db.getCheckoutSession(userId);

    if (
      !session ||
      session.step !== "AWAITING_RECEIPT" ||
      !session.pendingOrderId
    ) {
      return; // Not awaiting a receipt — ignore
    }

    const orderId = session.pendingOrderId;
    const order = db.getOrderById(orderId);

    if (!order) {
      return ctx.reply(
        "⚠️ Could not find your order. Please contact our support.",
      );
    }

    const bankName = session.bankName || "Not provided";
    db.clearCheckoutSession(userId);

    ctx.reply(
      `✅ *Payment screenshot received!*\n\n` +
        `📦 *Order:* #${orderId}\n` +
        `🏦 *Bank Used:* ${bankName}\n` +
        `🔍 Our team is reviewing your payment. You will be notified as soon as it is verified (usually within a few minutes).\n\n` +
        `Thank you for your patience! 🙏`,
      { parse_mode: "Markdown", ...orderTrackingKeyboard(orderId) },
    );

    // Forward to all admins for verification
    config.adminIds.forEach((adminId) => {
      const caption =
        `📸 *Payment Receipt — Order #${orderId}*\n\n` +
        `👤 Customer: ${order.customerName} (ID: ${userId})\n` +
        `💳 Method: ${order.paymentMethod}\n` +
        `🏦 Bank Used: ${bankName}\n` +
        `💰 Amount: ${order.total} ${config.currency}\n\n` +
        `Approve or reject:`;

      const keyboard = paymentVerificationKeyboard(orderId);
      const sendMethod = isPhoto
        ? bot.telegram.sendPhoto.bind(bot.telegram)
        : bot.telegram.sendDocument.bind(bot.telegram);

      sendMethod(adminId, fileId, {
        caption,
        parse_mode: "Markdown",
        ...keyboard,
      }).catch((err) =>
        console.warn(
          `Could not forward receipt to admin ${adminId}:`,
          err.message,
        ),
      );
    });
  }

  bot.on("text", (ctx, next) => {
    const userId = ctx.from.id;
    const session = db.getCheckoutSession(userId);

    if (!session || session.step !== "AWAITING_BANK_NAME") return next();

    const bankName = (ctx.message.text || "").trim();
    if (!bankName) return;

    db.setCheckoutSession(userId, {
      ...session,
      step: "AWAITING_RECEIPT",
      bankName,
    });

    ctx.reply(
      `✅ *Bank name saved:* ${bankName}\n\n` +
        `Now please upload the payment screenshot for verification.`,
      { parse_mode: "Markdown" },
    );
  });

  bot.on("photo", (ctx) => {
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    handleReceiptUpload(ctx, fileId, true);
  });

  bot.on("document", (ctx) => {
    const fileId = ctx.message.document.file_id;
    handleReceiptUpload(ctx, fileId, false);
  });

  // ── Customer: Check live provider status ──────────────────────────────────
  bot.action(/^payment_check_status_(.+)$/, async (ctx) => {
    const orderId = ctx.match[1];
    const order = db.getOrderById(orderId);

    if (!order) {
      return ctx.answerCbQuery("Order not found");
    }

    ctx.answerCbQuery("🔎 Checking payment status...");

    const result = await verifyPayment(order.paymentReference || order.id);
    if (result.enabled && result.status === "SUCCESS") {
      order.paymentProviderStatus = "SUCCESS";
      db.updateOrderStatus(orderId, "confirmed");
      db.save();

      return ctx.reply(
        `✅ *Payment Verified Automatically*\n\n` +
          `📦 *Order #${orderId}* is now confirmed.\n` +
          `💳 *Reference:* ${order.paymentReference || order.id}\n\n` +
          `Your order is moving to preparation!`,
        { parse_mode: "Markdown", ...orderTrackingKeyboard(orderId) },
      );
    }

    return ctx.reply(
      `⏳ *Payment is still pending.*\n\n` +
        `Provider status: ${result.status || "PENDING"}\n\n` +
        `Please wait a little longer or upload a payment screenshot if you already paid.`,
      { parse_mode: "Markdown", ...orderTrackingKeyboard(orderId) },
    );
  });

  // ── Admin: Approve Payment ─────────────────────────────────────────────────
  bot.action(/^payment_approve_(.+)$/, (ctx) => {
    const orderId = ctx.match[1];
    const order = db.getOrderById(orderId);
    if (!order) return ctx.answerCbQuery("Order not found");

    db.updateOrderStatus(orderId, "confirmed");
    ctx.answerCbQuery("✅ Payment approved!");
    ctx
      .editMessageCaption(
        `✅ *Payment APPROVED for Order #${orderId}*\n\n` +
          `💰 Amount: ${order.total} ${config.currency}\n` +
          `👤 Customer: ${order.customerName}\n\n` +
          `Customer has been notified. Use /admin to manage order status.`,
        { parse_mode: "Markdown" },
      )
      .catch(() => {
        ctx.reply(`✅ Payment approved for Order #${orderId}.`);
      });

    // Notify customer
    bot.telegram
      .sendMessage(
        order.userId,
        `🎉 *Payment Verified & Order Confirmed!*\n\n` +
          `📦 *Order #${orderId}* is now confirmed.\n` +
          `Our team will start packing your groceries right away!\n\n` +
          `⏱️ *Estimated Delivery:* 30 – 45 minutes`,
        { parse_mode: "Markdown", ...orderTrackingKeyboard(orderId) },
      )
      .catch((err) =>
        console.warn(`Could not notify customer ${order.userId}:`, err.message),
      );
  });

  // ── Admin: Reject Payment ──────────────────────────────────────────────────
  bot.action(/^payment_reject_(.+)$/, (ctx) => {
    const orderId = ctx.match[1];
    const order = db.getOrderById(orderId);
    if (!order) return ctx.answerCbQuery("Order not found");

    db.updateOrderStatus(orderId, "payment_rejected");
    ctx.answerCbQuery("❌ Payment rejected");
    ctx
      .editMessageCaption(
        `❌ *Payment REJECTED for Order #${orderId}*\n\n` +
          `Customer has been notified to resend a valid screenshot.`,
        { parse_mode: "Markdown" },
      )
      .catch(() => {
        ctx.reply(`❌ Payment rejected for Order #${orderId}.`);
      });

    // Notify customer
    bot.telegram
      .sendMessage(
        order.userId,
        `❌ *Payment Could Not Be Verified*\n\n` +
          `📦 *Order #${orderId}*\n\n` +
          `Unfortunately we could not verify your payment screenshot.\n\n` +
          `*Please try one of the following:*\n` +
          `• Resend a clearer screenshot of your payment confirmation\n` +
          `• Contact our support: ${config.supportPhone}\n\n` +
          `Your order is on hold and your items are still reserved.`,
        { parse_mode: "Markdown" },
      )
      .catch((err) =>
        console.warn(`Could not notify customer ${order.userId}:`, err.message),
      );
  });

  // ── Order Status Refresh ───────────────────────────────────────────────────
  bot.action(/^track_refresh_(.+)$/, (ctx) => {
    const orderId = ctx.match[1];
    const order = db.getOrderById(orderId);

    if (!order) return ctx.answerCbQuery("Order not found");

    ctx.answerCbQuery("🔄 Status refreshed!");
    const { label, bar } = formatOrderStatus(order.status);

    const text =
      `📦 *Order Tracking — #${order.id}*\n\n` +
      `📊 *Status:* ${label}\n` +
      `${bar}\n\n` +
      `💳 *Payment:* ${order.paymentMethod}\n` +
      `💰 *Total:* ${order.total} ${config.currency}\n` +
      `📍 *Address:* ${order.deliveryAddress}\n` +
      `🕒 *Placed at:* ${new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    return ctx
      .editMessageText(text, {
        parse_mode: "Markdown",
        ...orderTrackingKeyboard(order.id),
      })
      .catch(() => {});
  });

  // ── Admin: Update Order Status ─────────────────────────────────────────────
  // Regex: admin_status_MM-1001_confirmed  (orderId may contain hyphen & digits)
  bot.action(/^admin_status_(MM-\d+)_(.+)$/, async (ctx) => {
    const orderId = ctx.match[1];
    const newStatus = ctx.match[2];

    const order = db.getOrderById(orderId);
    if (!order) return answerCallbackQuery(ctx, "Order not found");

    const { label } = formatOrderStatus(newStatus);
    await answerCallbackQuery(ctx, `Updated → ${label}`);
    const updated = db.updateOrderStatus(orderId, newStatus);

    ctx
      .editMessageText(
        `🔔 *Order #${orderId} — Status Updated*\n\nNew status: *${label}*`,
        { parse_mode: "Markdown", ...adminOrderActionsKeyboard(orderId) },
      )
      .catch(() => {});

    // Push notification to customer
    const customerMsg =
      `🔔 *Update on Order #${orderId}*\n\n` +
      `📊 Status: *${label}*\n\n` +
      `Tap *📦 My Orders* to view live progress.`;

    bot.telegram
      .sendMessage(updated.userId, customerMsg, {
        parse_mode: "Markdown",
        ...orderTrackingKeyboard(orderId),
      })
      .catch((err) =>
        console.warn(
          `Could not notify customer ${updated.userId}:`,
          err.message,
        ),
      );
  });
}

// ── Step 2 → Step 3 helper (also called from bot/index.js for typed phone) ───
function proceedToPaymentStep(ctx, userId, phone) {
  db.setCheckoutSession(userId, { step: "AWAITING_PAYMENT", phone });

  // Restore the normal reply keyboard after the contact-share keyboard
  ctx.reply("💳 Selecting payment method...", mainMenuKeyboard());

  return ctx.reply(
    `✅ *Phone saved:* ${phone}\n\n` +
      `💳 *Step 3 of 3: Choose Payment Method*\n\n` +
      `How would you like to pay for your order?`,
    { parse_mode: "Markdown", ...checkoutPaymentKeyboard() },
  );
}

// ── Admin New-Order Alert ─────────────────────────────────────────────────────
function notifyAdminsOfNewOrder(bot, order) {
  if (!config.adminIds || config.adminIds.length === 0) return;

  let alert =
    `🚨 *NEW ORDER — #${order.id}*\n\n` +
    `👤 *Customer:* ${order.customerName}\n` +
    `📱 *Phone:* ${order.phone}\n` +
    `📍 *Address:* ${order.deliveryAddress}\n` +
    `💳 *Payment:* ${order.paymentMethod}\n` +
    `💰 *Total:* *${order.total} ${config.currency}*\n\n` +
    `*Items:*\n`;

  order.items.forEach((item) => {
    alert += `  • ${item.product.name} × ${item.quantity}\n`;
  });

  config.adminIds.forEach((adminId) => {
    bot.telegram
      .sendMessage(adminId, alert, {
        // ← fix: was passing alert string as chat ID
        parse_mode: "Markdown",
        ...adminOrderActionsKeyboard(order.id),
      })
      .catch((err) =>
        console.warn(`Admin alert failed for ${adminId}:`, err.message),
      );
  });
}

module.exports = {
  registerCheckoutHandlers,
  formatOrderStatus,
  proceedToPaymentStep,
  buildTelebirrInstructions,
  buildCBEInstructions,
};
