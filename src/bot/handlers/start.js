const config = require("../../config/env");
const db = require("../../database");
const { mainMenuKeyboard } = require("../keyboards/mainMenu");
const { escapeMarkdown } = require("../utils/markdown");

function registerStartHandler(bot) {
  bot.start((ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from?.first_name || "there";
    const lang = db.getUserLang(userId);

    const safeUserName = escapeMarkdown(userName);
    const safeMarketName = escapeMarkdown(config.minimarketName);

    const welcome =
      lang === "am"
        ? `👋 *እንኳን ወደ ${safeMarketName} በደህና መጡ፣ ${safeUserName}! * 🇪🇹\n\n` +
          `የሃዋሳ ከተማ ተመራጭ የሰፈር ሚኒማርኬት በቴሌግራም። ትኩስ እቃዎች በ 30–45 ደቂቃ ውስጥ በርዎ ድረስ ይደርሳሉ።\n\n` +
          `🛍️ *እቃዎችን ይመልከቱ* — ትኩስ አትክልት፣ የወተት ተዋጽኦ፣ መጠጦች እና ሌሎችም\n` +
          `🛒 *የእኔ ጋሪ* — የተመረጡ እቃዎችን ይገምግሙ እና ይዘዙ\n` +
          `📦 *ትዕዛዞቼ* — የትዕዛዝ ሁኔታን እና የአሽከርካሪ ጉዞን በቀጥታ ይከታተሉ\n` +
          `🌐 *ቋንቋ / Language* — ቋንቋዎን አማርኛ ወይም English ያድርጉ\n\n` +
          `ለመጀመር ከታች ካሉት አማራጮች አንዱን ይጫኑ!`
        : `👋 *Welcome to ${safeMarketName}, ${safeUserName}!* 🛒\n\n` +
          `Your favorite neighborhood minimarket in Hawassa, right inside Telegram.\n\n` +
          `🛍️ *Browse Products* — View categories & fresh arrivals\n` +
          `🛒 *My Cart* — Review selected items, promo discounts & checkout\n` +
          `📦 *My Orders* — Track real-time delivery status\n` +
          `🌐 *Language* — Switch between English & Amharic (አማርኛ) anytime\n\n` +
          `Choose an option from the menu below to get started!`;

    ctx.replyWithMarkdown(welcome, mainMenuKeyboard(lang));
  });
}

module.exports = { registerStartHandler };
