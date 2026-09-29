const { Markup } = require("telegraf");

/**
 * Payment method selection keyboard — Step 3 of checkout
 */
function checkoutPaymentKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("💵 Cash on Delivery (Pay at Door)", "pay_cod")],
    [Markup.button.callback("📱 Telebirr (Mobile Money)", "pay_telebirr")],
    [Markup.button.callback("🏦 Bank Transfer", "pay_cbe")],
    [Markup.button.callback("❌ Cancel Checkout", "checkout_cancel")],
  ]);
}

/**
 * Final Order Confirmation Keyboard (shown on order review screen)
 */
function checkoutConfirmationKeyboard(paymentMethod = "") {
  const rows = [];

  rows.push([
    Markup.button.callback(
      "✅ Confirm & Place Order",
      "checkout_confirm_order",
    ),
  ]);
  rows.push([
    Markup.button.callback(
      "⬅️ Change Payment Method",
      "checkout_change_payment",
    ),
  ]);
  rows.push([Markup.button.callback("❌ Cancel", "checkout_cancel")]);

  return Markup.inlineKeyboard(rows);
}

/**
 * Reply keyboard for sharing Telegram contact
 */
function shareContactKeyboard() {
  return Markup.keyboard([
    [Markup.button.contactRequest("📱 Share My Phone Number")],
    ["❌ Cancel Checkout"],
  ])
    .resize()
    .oneTime();
}

/**
 * Reply keyboard for sharing Telegram GPS location
 */
function shareLocationKeyboard() {
  return Markup.keyboard([
    [Markup.button.locationRequest("📍 Share My Current Location (GPS)")],
    ["❌ Cancel Checkout"],
  ])
    .resize()
    .oneTime();
}

/**
 * Keyboard shown after Telebirr payment instructions,
 * allowing 1-tap app launch or web portal access before uploading screenshot.
 */
function telebirrPaymentKeyboard(orderId = null) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "✅ Check Payment Status",
        orderId ? `payment_check_status_${orderId}` : "payment_check_status",
      ),
    ],
    [Markup.button.callback("❌ Cancel Checkout", "checkout_cancel")],
  ]);
}

/**
 * Keyboard shown after CBE Birr payment instructions,
 * allowing a live verification check instead of opening external play-store links.
 */
function cbePaymentKeyboard(orderId = null) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "✅ Check Payment Status",
        orderId ? `payment_check_status_${orderId}` : "payment_check_status",
      ),
    ],
    [Markup.button.callback("❌ Cancel Checkout", "checkout_cancel")],
  ]);
}

/**
 * Fallback keyboard for awaiting receipt
 */
function awaitingReceiptKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("❌ Cancel Checkout", "checkout_cancel")],
  ]);
}

/**
 * Admin keyboard for verifying a payment screenshot
 */
function paymentVerificationKeyboard(orderId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "✅ Approve Payment",
        `payment_approve_${orderId}`,
      ),
      Markup.button.callback("❌ Reject Payment", `payment_reject_${orderId}`),
    ],
    [
      Markup.button.callback(
        `📋 View Order #${orderId}`,
        `admin_view_order_${orderId}`,
      ),
    ],
  ]);
}

/**
 * Inline keyboard attached to a live order receipt or tracking card
 */
function orderTrackingKeyboard(orderId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🔄 Refresh Status", `track_refresh_${orderId}`),
      Markup.button.callback("📞 Contact Store", "support_store_info"),
    ],
    [Markup.button.callback("🛍️ Shop More Groceries", "nav_categories")],
  ]);
}

/**
 * Admin order management action buttons
 */
function adminOrderActionsKeyboard(orderId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Confirm", `admin_status_${orderId}_confirmed`),
      Markup.button.callback(
        "👨‍🍳 Preparing",
        `admin_status_${orderId}_preparing`,
      ),
    ],
    [
      Markup.button.callback(
        "🛵 Out for Delivery",
        `admin_status_${orderId}_out_for_delivery`,
      ),
      Markup.button.callback(
        "📦 Delivered",
        `admin_status_${orderId}_delivered`,
      ),
    ],
    [
      Markup.button.callback(
        "❌ Cancel Order",
        `admin_status_${orderId}_cancelled`,
      ),
    ],
  ]);
}

module.exports = {
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
};
