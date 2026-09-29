require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const adminIds = (process.env.ADMIN_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
  .map(Number);

const config = {
  botToken: required("BOT_TOKEN"),
  adminIds,
  minimarketName: process.env.MINIMARKET_NAME || "Hammer Shop",
  currency: process.env.CURRENCY || "ETB",
  supportPhone: process.env.SUPPORT_PHONE || "+251960675526",
  supportUsername: process.env.SUPPORT_USERNAME || "@Yechalesew21",
  storeLocation:
    process.env.STORE_LOCATION || "Ethiopia Hawassa, referal gibi gubae",
  storeHours: process.env.STORE_HOURS || "Mon - Sun: 8:00 AM - 9:00 PM",

  // Payment configuration
  telebirrPhone:
    process.env.TELEBIRR_PHONE || process.env.SUPPORT_PHONE || "+251960675526",
  telebirrName:
    process.env.TELEBIRR_NAME || process.env.MINIMARKET_NAME || "yechale mulu",
  cbeAccount: process.env.CBE_ACCOUNT || "1000528198388",
  cbeName:
    process.env.CBE_NAME || process.env.MINIMARKET_NAME || "yechale mulu",

  // Official provider integration settings
  paymentProviderMode: (
    process.env.PAYMENT_PROVIDER_MODE || "mock"
  ).toLowerCase(),
  paymentProviderBaseUrl: (process.env.PAYMENT_PROVIDER_BASE_URL || "").replace(
    /\/$/,
    "",
  ),
  paymentProviderApiKey: process.env.PAYMENT_PROVIDER_API_KEY || "",
  paymentProviderSecret: process.env.PAYMENT_PROVIDER_SECRET || "",
};

module.exports = config;
