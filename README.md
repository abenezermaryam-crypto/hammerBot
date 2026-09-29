# Minimarket Telegram Bot — Phase 2

Production-ready Telegram e-commerce & delivery bot for minimarkets.

## Status: Phase 2 — Logical Menu Flow & Feature Handlers

In Phase 1, the bot had menu buttons but no handlers (causing buttons to fall through to "I didn't understand that").

In **Phase 2**, we have:
1. **Redesigned the Menu Architecture**: Restructured buttons logically into discovery, cart, orders, and support.
2. **Full Menu Button Handlers**: Every button (`🛍️ Browse Products`, `🛒 My Cart`, `📦 My Orders`, `❤️ Favorites`, `🔎 Search Products`, `💬 Help & Support`) is now actively handled.
3. **Backwards Compatibility**: Previous Phase 1 button labels (`🛍️ Products`, `🚚 Track Delivery`, `💬 Feedback`, `📞 Contact Us`) are also handled.
4. **Interactive Support & Help Submenu**: Inline buttons for FAQs, Contact/WhatsApp info, and Feedback.
5. **Phase 2 Admin Dashboard**: Stubs for products, categories, orders, and broadcast messaging.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create a `.env` file from `.env.example`:
   ```env
   BOT_TOKEN=your_bot_token_from_botfather
   ADMIN_IDS=your_telegram_id
   MINIMARKET_NAME=Your Minimarket
   CURRENCY=ETB
   SUPPORT_PHONE=+251900000000
   SUPPORT_USERNAME=@minimarketsupport
   ```

3. **Run the bot:**
   ```bash
   npm start
   ```
   Or run in live reload mode during development:
   ```bash
   npm run dev
   ```


