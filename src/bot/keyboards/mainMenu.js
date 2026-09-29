const { Markup } = require('telegraf');

/**
 * Main persistent Reply Keyboard.
 * Supports English and Amharic.
 */
function mainMenuKeyboard(lang = 'en') {
  if (lang === 'am') {
    return Markup.keyboard([
      ['🛍️ እቃዎችን ይመልከቱ', '🛒 የእኔ ጋሪ'],
      ['📦 ትዕዛዞቼ', '❤️ ተወዳጆች'],
      ['🔎 እቃ ይፈልጉ', '💬 እርዳታ እና ድጋፍ'],
      ['🌐 ቋንቋ / Language'],
    ]).resize();
  }

  return Markup.keyboard([
    ['🛍️ Browse Products', '🛒 My Cart'],
    ['📦 My Orders', '❤️ Favorites'],
    ['🔎 Search Products', '💬 Help & Support'],
    ['🌐 ቋንቋ / Language'],
  ]).resize();
}

/**
 * Language selection inline keyboard
 */
function languageSelectKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🇺🇸 English', 'set_lang_en'),
      Markup.button.callback('🇪🇹 አማርኛ (Amharic)', 'set_lang_am'),
    ],
  ]);
}

/**
 * Help & Support inline buttons
 */
function helpSupportInlineKeyboard(supportUsername, supportPhone, lang = 'en') {
  const buttons = [];
  if (supportUsername) {
    buttons.push([Markup.button.url(lang === 'am' ? '💬 የቴሌግራም ድጋፍ' : '💬 Chat with Support', `https://t.me/${supportUsername.replace('@', '')}`)]);
  }
  buttons.push([
    Markup.button.callback(lang === 'am' ? '📞 አድራሻ እና ሰዓት' : '📞 Store Info & Hours', 'support_store_info'),
    Markup.button.callback(lang === 'am' ? '✍️ አስተያየት ይላኩ' : '✍️ Send Feedback', 'support_feedback'),
  ]);
  buttons.push([Markup.button.callback(lang === 'am' ? '❓ ተደጋጋሚ ጥያቄዎች' : '❓ FAQs', 'support_faq')]);
  return Markup.inlineKeyboard(buttons);
}

/**
 * Empty Cart inline keyboard prompting user to start shopping
 */
function emptyCartKeyboard(lang = 'en') {
  return Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'am' ? '🛍️ አሁኑኑ እቃ ይምረጡ' : '🛍️ Start Shopping Now', 'action_browse_catalog')],
  ]);
}

module.exports = {
  mainMenuKeyboard,
  languageSelectKeyboard,
  helpSupportInlineKeyboard,
  emptyCartKeyboard,
};
