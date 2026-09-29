const { requireAdmin } = require('../middlewares/isAdmin');
const { Markup } = require('telegraf');
const db = require('../../database');
const config = require('../../config/env');
const { adminOrderActionsKeyboard } = require('../keyboards/checkout');

function adminDashboardKeyboard(pendingCount) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(`🛒 Orders & Fulfillment (${pendingCount})`, 'admin_orders')],
    [Markup.button.callback('📊 Sales Reports & Analytics', 'admin_sales_report')],
    [
      Markup.button.callback('➕ Add New Product', 'admin_add_prod_start'),
      Markup.button.callback('📦 Inventory & Stock', 'admin_manage_stock'),
    ],
    [Markup.button.callback('🏷️ Manage Promo Codes', 'admin_manage_promos')],
    [Markup.button.callback('📢 Broadcast Announcement', 'admin_broadcast')],
  ]);
}

function formatSalesReport(stats, currency = 'ETB') {
  let periodLabel = 'Today';
  if (stats.period === 'week') periodLabel = 'Last 7 Days';
  if (stats.period === 'all') periodLabel = 'All Time';

  let report =
    `📊 *Sales & Revenue Report — ${periodLabel}*\n\n` +
    `💰 *Total Revenue:* *${stats.totalRevenue} ${currency}*\n` +
    `📦 *Total Orders Placed:* ${stats.totalOrders}\n` +
    `✅ *Delivered / Completed:* ${stats.completedOrders}\n` +
    `⏳ *In-Progress / Pending:* ${stats.pendingOrders}\n` +
    `❌ *Cancelled / Rejected:* ${stats.cancelledOrders}\n` +
    `💵 *Average Order Value:* ${stats.averageOrderValue} ${currency}\n\n` +
    `💳 *Payment Method Breakdown:*\n` +
    `• Cash on Delivery: ${stats.paymentBreakdown['Cash on Delivery'] || 0} ${currency}\n` +
    `• Telebirr: ${stats.paymentBreakdown['Telebirr'] || 0} ${currency}\n` +
    `• CBE Birr / Bank: ${stats.paymentBreakdown['CBE Birr / Bank Transfer'] || 0} ${currency}\n\n` +
    `🏆 *Top Selling Products:*\n`;

  if (stats.topProducts.length === 0) {
    report += `_No product sales recorded in this period._`;
  } else {
    stats.topProducts.forEach((p, i) => {
      report += `${i + 1}. *${p.name}* — ${p.qty} sold\n`;
    });
  }

  return report;
}

function registerAdminHandler(bot) {
  // Command: /admin
  bot.command('admin', requireAdmin, (ctx) => {
    const orders = db.getAllOrders();
    const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'awaiting_payment').length;

    ctx.reply(
      `📊 *${config.minimarketName} — Admin Operations*\n\n` +
      `📦 *Total Products:* ${db.products.length}\n` +
      `🏷️ *Departments:* ${db.categories.length}\n` +
      `🛒 *Total Orders:* ${orders.length} (${pendingCount} pending/awaiting)\n` +
      `👥 *Registered Customers:* ${db.getAllCustomerIds().length}\n\n` +
      `Select an administrative tool below:`,
      {
        parse_mode: 'Markdown',
        ...adminDashboardKeyboard(pendingCount),
      }
    );
  });

  // Quick shortcut: /sales
  bot.command('sales', requireAdmin, (ctx) => {
    const stats = db.getSalesAnalytics('today');
    const text = formatSalesReport(stats, config.currency);
    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📅 Today', 'admin_sales_today'),
          Markup.button.callback('📆 This Week', 'admin_sales_week'),
          Markup.button.callback('📈 All Time', 'admin_sales_all'),
        ],
        [Markup.button.callback('⬅️ Back to Admin', 'admin_menu_back')],
      ]),
    });
  });

  // ── 1. Orders Management ──────────────────────────────────────────────────
  bot.action('admin_orders', (ctx) => {
    ctx.answerCbQuery();
    const orders = db.getAllOrders();

    if (orders.length === 0) {
      return ctx.reply('🛒 *No orders in the system yet.*', { parse_mode: 'Markdown' });
    }

    let text = `🛒 *Recent Orders:*\n\n`;
    const buttons = [];

    orders.slice(0, 6).forEach((order) => {
      text += `• *#${order.id}* — ${order.customerName} (${order.total} ${config.currency})\n`;
      text += `  Status: \`${order.status}\` | Payment: ${order.paymentMethod}\n`;
      text += `  Deliver to: ${order.deliveryAddress}\n\n`;
      buttons.push([Markup.button.callback(`Manage #${order.id} (${order.status})`, `admin_view_order_${order.id}`)]);
    });

    buttons.push([Markup.button.callback('⬅️ Back to Admin Menu', 'admin_menu_back')]);

    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  });

  // Admin view individual order
  bot.action(/^admin_view_order_(.+)$/, (ctx) => {
    const orderId = ctx.match[1];
    const order = db.getOrderById(orderId);
    if (!order) return ctx.answerCbQuery('Order not found');

    ctx.answerCbQuery();
    let text =
      `📋 *Order Management: #${order.id}*\n\n` +
      `👤 *Customer:* ${order.customerName} (ID: \`${order.userId}\`)\n` +
      `📱 *Phone:* ${order.phone}\n` +
      `📍 *Address:* ${order.deliveryAddress}\n` +
      `💳 *Payment:* ${order.paymentMethod}\n` +
      `💰 *Total:* ${order.total} ${config.currency}\n`;

    if (order.discount > 0) {
      text += `🏷️ *Discount:* -${order.discount} ${config.currency} (${order.promoCode || ''})\n`;
    }

    text +=
      `📊 *Current Status:* \`${order.status}\`\n\n` +
      `*Items in order:*\n`;

    order.items.forEach((item) => {
      text += `• ${item.product.name} × ${item.quantity}\n`;
    });

    text += `\nUpdate order status:`;

    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...adminOrderActionsKeyboard(order.id),
    });
  });

  // ── 2. Sales Reports & Analytics (Phase 12 Priority) ──────────────────────
  bot.action('admin_sales_report', (ctx) => {
    ctx.answerCbQuery();
    const stats = db.getSalesAnalytics('today');
    const text = formatSalesReport(stats, config.currency);

    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📅 Today', 'admin_sales_today'),
          Markup.button.callback('📆 This Week', 'admin_sales_week'),
          Markup.button.callback('📈 All Time', 'admin_sales_all'),
        ],
        [Markup.button.callback('⬅️ Back to Admin Menu', 'admin_menu_back')],
      ]),
    });
  });

  bot.action('admin_sales_today', (ctx) => {
    ctx.answerCbQuery();
    const stats = db.getSalesAnalytics('today');
    const text = formatSalesReport(stats, config.currency);
    return ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('• Today •', 'admin_sales_today'),
          Markup.button.callback('📆 This Week', 'admin_sales_week'),
          Markup.button.callback('📈 All Time', 'admin_sales_all'),
        ],
        [Markup.button.callback('⬅️ Back to Admin Menu', 'admin_menu_back')],
      ]),
    }).catch(() => {});
  });

  bot.action('admin_sales_week', (ctx) => {
    ctx.answerCbQuery();
    const stats = db.getSalesAnalytics('week');
    const text = formatSalesReport(stats, config.currency);
    return ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📅 Today', 'admin_sales_today'),
          Markup.button.callback('• This Week •', 'admin_sales_week'),
          Markup.button.callback('📈 All Time', 'admin_sales_all'),
        ],
        [Markup.button.callback('⬅️ Back to Admin Menu', 'admin_menu_back')],
      ]),
    }).catch(() => {});
  });

  bot.action('admin_sales_all', (ctx) => {
    ctx.answerCbQuery();
    const stats = db.getSalesAnalytics('all');
    const text = formatSalesReport(stats, config.currency);
    return ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📅 Today', 'admin_sales_today'),
          Markup.button.callback('📆 This Week', 'admin_sales_week'),
          Markup.button.callback('• All Time •', 'admin_sales_all'),
        ],
        [Markup.button.callback('⬅️ Back to Admin Menu', 'admin_menu_back')],
      ]),
    }).catch(() => {});
  });

  // ── 3. Manage Promo Codes (Phase 12 Priority) ─────────────────────────────
  bot.action('admin_manage_promos', (ctx) => {
    ctx.answerCbQuery();
    const promos = db.getPromoCodes();

    let text = `🏷️ *Active & Inactive Promo Codes:*\n\n`;
    const buttons = [];

    promos.forEach((p) => {
      const statusIcon = p.active ? '🟢 Active' : '🔴 Paused';
      const valStr = p.type === 'percent' ? `${p.value}%` : `${p.value} ${config.currency}`;
      text += `• *${p.code}* (${valStr} off, min ${p.minOrder} ${config.currency}) — ${statusIcon}\n`;
      text += `  _Uses: ${p.uses || 0} | ${p.description}_\n\n`;

      buttons.push([
        Markup.button.callback(`${p.active ? '⏸️ Pause' : '▶️ Activate'}: ${p.code}`, `admin_toggle_promo_${p.code}`),
      ]);
    });

    buttons.push([Markup.button.callback('➕ Create New Promo Code', 'admin_add_promo_start')]);
    buttons.push([Markup.button.callback('⬅️ Back to Admin Menu', 'admin_menu_back')]);

    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  });

  bot.action(/^admin_toggle_promo_(.+)$/, (ctx) => {
    const code = ctx.match[1];
    const newState = db.togglePromoCode(code);
    ctx.answerCbQuery(newState ? `🟢 Activated ${code}` : `⏸️ Paused ${code}`);

    ctx.reply(
      `Promo code *${code}* is now *${newState ? '🟢 Active' : '⏸️ Paused'}*.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('admin_add_promo_start', (ctx) => {
    ctx.answerCbQuery();
    const adminId = ctx.from.id;

    db.setAdminSession(adminId, {
      action: 'ADD_PROMO',
      step: 'AWAITING_CODE',
      draft: {},
    });

    ctx.reply(
      `🏷️ *Create New Promo Code — Step 1 of 4*\n\n` +
      `Send the Promo Code Name (e.g. *SUMMER25*, *WEEKEND*, *EID10*):\n\n` +
      `_(Type "cancel" anytime to abort)_`,
      { parse_mode: 'Markdown' }
    );
  });

  // ── 4. Add New Product Wizard ─────────────────────────────────────────────
  bot.action('admin_add_prod_start', (ctx) => {
    ctx.answerCbQuery();
    const categories = db.getCategories();
    const buttons = categories.map((cat) => [
      Markup.button.callback(`${cat.icon} ${cat.name}`, `admin_add_cat_${cat.id}`),
    ]);
    buttons.push([Markup.button.callback('❌ Cancel', 'admin_cancel_action')]);

    ctx.reply(
      `➕ *Add New Product — Step 1 of 4*\n\nSelect which department this product belongs to:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      }
    );
  });

  bot.action(/^admin_add_cat_(.+)$/, (ctx) => {
    const categoryId = ctx.match[1];
    const category = db.getCategoryById(categoryId);
    if (!category) return ctx.answerCbQuery('Category not found');

    ctx.answerCbQuery();
    const adminId = ctx.from.id;

    db.setAdminSession(adminId, {
      action: 'ADD_PRODUCT',
      step: 'AWAITING_NAME',
      draft: { categoryId },
    });

    ctx.reply(
      `🏷️ Adding to: *${category.icon} ${category.name}*\n\n` +
      `*Step 2 of 4: Product Name*\n` +
      `Please send the name of the product (e.g. *Fresh Strawberries*, *Yogurt 500g*):\n\n` +
      `_(Type "cancel" anytime to abort)_`,
      { parse_mode: 'Markdown' }
    );
  });

  // ── 5. Inventory & Stock Control ──────────────────────────────────────────
  bot.action('admin_manage_stock', (ctx) => {
    ctx.answerCbQuery();
    const categories = db.getCategories();
    const buttons = categories.map((cat) => [
      Markup.button.callback(`${cat.icon} ${cat.name} (${db.getProductsByCategory(cat.id).length})`, `admin_stock_cat_${cat.id}`),
    ]);
    buttons.push([Markup.button.callback('⬅️ Back to Admin Menu', 'admin_menu_back')]);

    ctx.reply(
      `📦 *Inventory & Stock Control*\n\nChoose a department to manage product stock or delete items:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      }
    );
  });

  // List products in selected category for stock toggling
  bot.action(/^admin_stock_cat_(.+)$/, (ctx) => {
    const categoryId = ctx.match[1];
    const category = db.getCategoryById(categoryId);
    if (!category) return ctx.answerCbQuery('Category not found');

    ctx.answerCbQuery();
    const products = db.getProductsByCategory(categoryId);

    if (products.length === 0) {
      return ctx.reply(`No products found in ${category.name}.`);
    }

    let text = `📦 *${category.icon} ${category.name} Products:*\n\n`;
    const buttons = [];

    products.forEach((prod) => {
      const stockIcon = prod.inStock ? '🟢 In Stock' : '🔴 Out of Stock';
      text += `• *${prod.name}* — ${prod.price} ${config.currency} / ${prod.unit} (${stockIcon})\n`;
      buttons.push([
        Markup.button.callback(`${prod.inStock ? 'Mark Out of Stock' : 'Mark In Stock'}: ${prod.name}`, `admin_toggle_stock_${prod.id}`),
        Markup.button.callback('🗑️', `admin_del_prod_${prod.id}`),
      ]);
    });

    buttons.push([Markup.button.callback('⬅️ Back to Departments', 'admin_manage_stock')]);

    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  });

  // Toggle inStock status
  bot.action(/^admin_toggle_stock_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    const newStock = db.toggleProductStock(productId);
    const prod = db.getProductById(productId);

    ctx.answerCbQuery(newStock ? '🟢 Marked In Stock' : '🔴 Marked Out of Stock');

    ctx.reply(
      `Updated *${prod.name}* stock to: *${newStock ? '🟢 In Stock' : '🔴 Out of Stock'}*`,
      { parse_mode: 'Markdown' }
    );
  });

  // Delete product
  bot.action(/^admin_del_prod_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    const prod = db.getProductById(productId);
    if (!prod) return ctx.answerCbQuery('Product not found');

    db.deleteProduct(productId);
    ctx.answerCbQuery('🗑️ Product deleted');
    ctx.reply(`🗑️ Deleted *${prod.name}* from the store catalog.`, { parse_mode: 'Markdown' });
  });

  // ── 6. Customer Broadcast ─────────────────────────────────────────────────
  bot.action('admin_broadcast', (ctx) => {
    ctx.answerCbQuery();
    const adminId = ctx.from.id;
    const customerCount = db.getAllCustomerIds().length;

    db.setAdminSession(adminId, {
      action: 'BROADCAST',
      step: 'AWAITING_MESSAGE',
    });

    ctx.reply(
      `📢 *Broadcast Announcement*\n\n` +
      `This message will be dispatched immediately to all *${customerCount}* registered customers.\n\n` +
      `Type the announcement text below, or type "cancel" to abort:`,
      { parse_mode: 'Markdown' }
    );
  });

  // ── 7. Admin Direct Reply to Customer Feedback ───────────────────────────
  bot.action(/^admin_reply_(\d+)$/, (ctx) => {
    const targetUserId = Number(ctx.match[1]);
    ctx.answerCbQuery();
    const adminId = ctx.from.id;

    db.setAdminSession(adminId, {
      action: 'REPLY_CUSTOMER',
      targetUserId,
    });

    ctx.reply(
      `✍️ *Replying to Customer (ID: ${targetUserId})*\n\n` +
      `Type your response below. It will be delivered directly to the customer as an official message from ${config.minimarketName}:`,
      { parse_mode: 'Markdown' }
    );
  });

  // Cancel action helper
  bot.action('admin_cancel_action', (ctx) => {
    ctx.answerCbQuery('Action cancelled');
    db.clearAdminSession(ctx.from.id);
    ctx.reply('Cancelled.', { parse_mode: 'Markdown' });
  });

  bot.action('admin_menu_back', (ctx) => {
    ctx.answerCbQuery();
    const orders = db.getAllOrders();
    const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'awaiting_payment').length;

    ctx.reply(
      `📊 *${config.minimarketName} Admin Dashboard*`,
      adminDashboardKeyboard(pendingCount)
    );
  });
}

module.exports = { registerAdminHandler, formatSalesReport };
