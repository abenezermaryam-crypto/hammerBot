# Minimarket Telegram Bot — Complete Project Phases & Roadmap

This document outlines the full roadmap for the **Minimarket Telegram Bot**, from initial setup to production deployment.

---

## 🗺️ Project Phases Overview

| Phase | Title | Status | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Initialization & Core Skeleton** | ✅ Complete | Telegraf setup, `.env` validation, `/start`, `/admin` stub, fallback handler |
| **Phase 2** | **Menu Architecture & Navigation** | ✅ Complete | Restructured 6-button keyboard, active handlers, support & cart submenus |
| **Phase 3** | **Database & Data Modeling** | ✅ Complete | Embedded JSON persistent store: Categories, Products, Carts, Favorites |
| **Phase 4** | **Product Catalog & Category Buttons** | ✅ Complete | Interactive category grid, product cards, 1-tap cart additions, search |
| **Phase 5** | **Search & Favorites (Wishlist)** | ✅ Complete | Keyword search engine, favorite toggling, wishlist quick-reorder |
| **Phase 6** | **Shopping Cart Engine** | ✅ Complete | Dynamic cart, quantity increment/decrement `[+]` `[-]`, itemized totals |
| **Phase 7** | **Checkout & Delivery Details** | ✅ Complete | Telegram GPS pin / address, phone share, payment method selection |
| **Phase 8** | **Orders & Delivery Tracking** | ✅ Complete | Order IDs, visual progress bar, real-time customer push alerts |
| **Phase 9** | **Payments Integration** | ✅ Complete | COD instant confirm, Telebirr/CBE instructions, screenshot upload, admin verify/reject |
| **Phase 10** | **Customer Support & FAQs** | ✅ Complete | Interactive FAQs, two-way feedback forwarding, manager direct reply |
| **Phase 11** | **Admin Dashboard & Inventory** | ✅ Complete | Live product creation wizard, stock toggling, customer broadcast alerts |
| **Phase 12-A** | **Advanced E-Commerce Enhancements** | ✅ Complete | Amharic language toggle, 2-way promo engine (single-use Welcome & >1000 ETB Special Offer), sales analytics |
| **Phase 12-B** | **Production & Deployment** | ⏳ Planned | PM2 / Docker, error alerting, database backups, rate limiting |

---

## Detailed Phase Breakdown

### Phase 1: Project Initialization & Architecture (Completed)
* Proven skeleton running with Telegraf and Node.js.
* Strict `.env` parsing preventing runtime crashes.
* Role-based access control checking Telegram numeric IDs.
* Graceful fallback handler for unrecognized text.

### Phase 2: Menu Architecture & Navigation Flow (Current Phase)
* Fix the 8-button cluttered layout into a clean, logical 6-button layout:
  * `[ 🛍️ Browse Products ]` `[ 🛒 My Cart ]`
  * `[ 📦 My Orders ]` `[ ❤️ Favorites ]`
  * `[ 🔎 Search Products ]` `[ 💬 Help & Support ]`
* Ensure every button has a working handler and does not trigger fallback errors.
* Build interactive inline keyboards for FAQs, Store Hours, and Cart actions.

### Phase 3: Database & Data Modeling
* Implement lightweight database storage (e.g. SQLite with Prisma or better-sqlite3).
* Tables:
  * `users` (id, telegram_id, name, phone, address, created_at)
  * `categories` (id, name, icon, sort_order)
  * `products` (id, category_id, name, description, price, image_url, in_stock)
  * `cart_items` (id, user_id, product_id, quantity)
  * `orders` (id, user_id, status, total_amount, delivery_address, phone, created_at)
  * `order_items` (id, order_id, product_id, quantity, unit_price)

### Phase 4: Product Catalog & Browsing
* Dynamic category listing from database.
* Product card presentation:
  * Product photo with caption (title, price in ETB, stock availability).
  * Inline buttons: `[ ➕ Add to Cart ]` `[ ❤️ Favorite ]` `[ ⬅️ Prev ]` `[ Next ➡️ ]`.

### Phase 5: Search & Favorites
* Search handler: Users type product keywords and get instant results.
* Favorites: Store user's favorite products for 1-tap reordering.

### Phase 6: Shopping Cart System
* In-memory or database-backed cart for each user.
* Cart view displays:
  * List of items with itemized costs.
  * Inline `[+]` and `[-]` buttons to modify quantities.
  * `[ 🗑️ Clear Cart ]` and `[ 💳 Proceed to Checkout ]`.

### Phase 7: Interactive Checkout
* Multi-step Telegram conversation wizard:
  1. Share delivery location (Telegram GPS pin or written address).
  2. Share phone number (Telegram native contact share button).
  3. Order summary & final confirmation.

### Phase 8: Order Lifecycle & Tracking
* Automatic order ID generation.
* Real-time notifications sent to the customer as their order progresses.
* Customer can tap `[ 🚚 Track Delivery ]` to see the current order step.

### Phase 9: Payments
* Ethiopian payment methods: Telebirr QR / manual transfer, CBE Birr, Chapa gateway, or Cash on Delivery.
* Screenshot / transaction code verification for manual payments.

### Phase 10: Support & Feedback
* In-bot FAQ accordion.
* Feedback submission mechanism that sends reports directly to admins.

### Phase 11: Admin Dashboard (Replaces Phase 1 Stub)
* Accessible via `/admin` only for IDs in `ADMIN_IDS`.
* Add new products directly from Telegram (send photo, title, price).
* Order management: View pending orders, mark as "Out for Delivery" or "Delivered".

### Phase 12: Production Hardening
* Setup PM2 process manager for 24/7 uptime.
* Setup error alerting and database backup cron jobs.
