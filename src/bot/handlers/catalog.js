const { Markup } = require('telegraf');
const config = require('../../config/env');
const db = require('../../database');
const {
  categoriesKeyboard,
  productsInCategoryKeyboard,
  productDetailKeyboard,
  cartManagementKeyboard,
  searchResultsKeyboard,
} = require('../keyboards/catalog');
const { emptyCartKeyboard } = require('../keyboards/mainMenu');
const { t } = require('../../i18n');

function registerCatalogHandlers(bot) {
  // Helper to render category list
  const renderCategories = (ctx) => {
    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    const categories = db.getCategories();
    const text =
      `🛍️ *${config.minimarketName} Catalog*\n\n` +
      `${t(lang, 'catalog_sub')}`;

    if (ctx.callbackQuery) {
      return ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...categoriesKeyboard(categories, lang),
      }).catch(() => ctx.reply(text, { parse_mode: 'Markdown', ...categoriesKeyboard(categories, lang) }));
    }
    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...categoriesKeyboard(categories, lang),
    });
  };

  // Main menu button triggers (English & Amharic)
  bot.hears(['🛍️ Browse Products', '🛍️ Products', '🛍️ እቃዎችን ይመልከቱ'], (ctx) => {
    return renderCategories(ctx);
  });

  // Action to navigate back to categories
  bot.action('nav_categories', (ctx) => {
    ctx.answerCbQuery();
    return renderCategories(ctx);
  });

  // Category Selected Callback: cat_<categoryId>
  bot.action(/^cat_(.+)$/, (ctx) => {
    const categoryId = ctx.match[1];
    const category = db.getCategoryById(categoryId);

    if (!category) {
      ctx.answerCbQuery('Category not found');
      return renderCategories(ctx);
    }

    ctx.answerCbQuery();
    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    const products = db.getProductsByCategory(categoryId);

    let text = `${category.icon} *${category.name}*\n_${category.description}_\n\n`;
    if (products.length === 0) {
      text += `Currently no items available in this category.`;
    } else {
      text += lang === 'am'
        ? `እቃዎችን ለመመልከት ይንኩ ወይም በቀጥታ *➕ ጨምር* የሚለውን ይጫኑ፡`
        : `Select an item to view details or tap *➕ Add* for 1-tap cart addition:`;
    }

    return ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...productsInCategoryKeyboard(products, categoryId, config.currency, lang),
    }).catch(() => {
      ctx.reply(text, {
        parse_mode: 'Markdown',
        ...productsInCategoryKeyboard(products, categoryId, config.currency, lang),
      });
    });
  });

  // Product Detail Selected Callback: prod_<productId>
  bot.action(/^prod_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    const product = db.getProductById(productId);

    if (!product) {
      return ctx.answerCbQuery('Item not found');
    }

    ctx.answerCbQuery();
    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    const isFav = db.isFavorite(userId, productId);

    const stockText = product.inStock
      ? (lang === 'am' ? '✅ አለ (በክምችት ላይ)' : '✅ In Stock')
      : (lang === 'am' ? '❌ አልቋል' : '❌ Out of Stock');

    const text =
      `🏷️ *${product.name}*\n\n` +
      `💰 *Price:* ${product.price} ${config.currency} / ${product.unit}\n` +
      `📦 *Status:* ${stockText}\n` +
      `📝 *Details:* ${product.description}`;

    return ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...productDetailKeyboard(product, isFav, product.categoryId, lang),
    }).catch(() => {
      ctx.reply(text, {
        parse_mode: 'Markdown',
        ...productDetailKeyboard(product, isFav, product.categoryId, lang),
      });
    });
  });

  // Quick Add Button (from product list): quick_add_<productId>
  bot.action(/^quick_add_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    const product = db.getProductById(productId);
    if (!product) {
      return ctx.answerCbQuery('Item not found');
    }

    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    const cart = db.addToCart(userId, productId, 1);
    const alertMsg = lang === 'am'
      ? `✅ ${product.name} ወደ ጋሪ ተጨምሯል! (በጋሪ ውስጥ: ${cart.itemCount} እቃዎች)`
      : `✅ Added ${product.name} to cart! (${cart.itemCount} items)`;
    ctx.answerCbQuery(alertMsg);
  });

  // Add to Cart Button (from product detail): cart_add_<productId>
  bot.action(/^cart_add_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    const product = db.getProductById(productId);
    if (!product) {
      return ctx.answerCbQuery('Item not found');
    }

    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    const cart = db.addToCart(userId, productId, 1);
    const alertMsg = lang === 'am'
      ? `✅ ወደ ጋሪ ተጨምሯል! አጠቃላይ: ${cart.itemCount} እቃዎች`
      : `✅ Added to cart! Total: ${cart.itemCount} items`;
    ctx.answerCbQuery(alertMsg);
  });

  // Toggle Favorite: fav_toggle_<productId>
  bot.action(/^fav_toggle_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    const product = db.getProductById(productId);
    if (!product) {
      return ctx.answerCbQuery('Item not found');
    }

    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    const isNowFav = db.toggleFavorite(userId, productId);
    const alertMsg = isNowFav
      ? (lang === 'am' ? '❤️ ወደ ተወዳጆች ተቀምጧል!' : '❤️ Added to favorites!')
      : (lang === 'am' ? '💔 ከተወዳጆች ተሰርዟል' : '💔 Removed from favorites');
    ctx.answerCbQuery(alertMsg);

    // Update keyboard to reflect new favorite state
    return ctx.editMessageReplyMarkup(
      productDetailKeyboard(product, isNowFav, product.categoryId, lang).reply_markup
    ).catch(() => {});
  });

  // Action: View Cart from inline button
  bot.action('action_view_cart', (ctx) => {
    ctx.answerCbQuery();
    renderCart(ctx);
  });

  // Cart Increment: cart_inc_<productId>
  bot.action(/^cart_inc_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    const userId = ctx.from.id;
    db.updateCartQuantity(userId, productId, 1);
    ctx.answerCbQuery();
    return renderCart(ctx);
  });

  // Cart Decrement: cart_dec_<productId>
  bot.action(/^cart_dec_(.+)$/, (ctx) => {
    const productId = ctx.match[1];
    const userId = ctx.from.id;
    db.updateCartQuantity(userId, productId, -1);
    ctx.answerCbQuery();
    return renderCart(ctx);
  });

  // Clear Cart Confirmation
  bot.action('cart_clear_confirm', (ctx) => {
    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    db.clearCart(userId);
    ctx.answerCbQuery(lang === 'am' ? '🗑️ ጋሪው ጸድቷል' : '🗑️ Cart cleared');
    return renderCart(ctx);
  });

  // ── Promo Code Actions in Cart ───────────────────────────────────────────
  bot.action('cart_apply_promo', (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id;
    const lang = db.getUserLang(userId);
    const cart = db.getCart(userId);
    db.setCheckoutSession(userId, { step: 'AWAITING_PROMO' });

    const buttons = [
      [Markup.button.callback('🎁 Welcome Offer (50 ETB Off — 1st Order)', 'apply_preset_WELCOME')],
      [Markup.button.callback('🌟 Special Offer: >1,000 ETB (100 ETB Off)', 'apply_preset_SPECIAL1000')],
      [Markup.button.callback(lang === 'am' ? '❌ ተመለስ' : '❌ Cancel', 'cart_cancel_promo')],
    ];

    const text =
      lang === 'am'
        ? `🏷️ *የሃመር ሾፕ የቅናሽ ኩፖን አማራጮች፡*\n\n` +
          `1️⃣ *WELCOME* — ለመጀመሪያ ጊዜ ለሚገዙ ደንበኞች *50 ብር ቅናሽ* (አንዴ ብቻ የሚሰራ)\n` +
          `2️⃣ *SPECIAL1000* — ከ 1,000 ብር በላይ ለሚገዙ ደንበኞች *100 ብር ልዩ ቅናሽ*\n\n` +
          `_ከታች ካሉት አማራጮች አንዱን ይጫኑ ወይም የራስዎን ኮድ ይጻፉ፡_`
        : `🏷️ *Hammer Shop Promo Offers:*\n\n` +
          `1️⃣ *WELCOME* — *50 ETB off* your first order (Single-use only!)\n` +
          `2️⃣ *SPECIAL1000* — *100 ETB special discount* when you buy more than 1,000 ETB!\n\n` +
          `_Tap an offer below to apply directly, or type your custom promo code:_`;

    ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  });

  bot.action(/^apply_preset_(.+)$/, (ctx) => {
    const code = ctx.match[1];
    const userId = ctx.from.id;
    const cart = db.getCart(userId);
    const validation = db.validatePromoCode(userId, code, cart.total);

    if (!validation.valid) {
      ctx.answerCbQuery();
      return ctx.reply(validation.message, { parse_mode: 'Markdown' });
    }

    ctx.answerCbQuery('Promo code applied!');
    db.setCheckoutSession(userId, {
      step: null,
      appliedPromo: {
        code: validation.promo.code,
        discount: validation.discount,
      },
    });

    ctx.reply(validation.message, { parse_mode: 'Markdown' });
    return renderCart(ctx);
  });

  bot.action('cart_cancel_promo', (ctx) => {
    ctx.answerCbQuery('Cancelled');
    const userId = ctx.from.id;
    const session = db.getCheckoutSession(userId);
    if (session) session.step = null;
    return renderCart(ctx);
  });

  bot.action('cart_remove_promo', (ctx) => {
    const userId = ctx.from.id;
    const session = db.getCheckoutSession(userId);
    if (session) {
      delete session.appliedPromo;
    }
    ctx.answerCbQuery('Promo code removed');
    return renderCart(ctx);
  });

  bot.action('cart_promo_active', (ctx) => {
    ctx.answerCbQuery('Promo discount active on your cart!');
  });

  // Search Prompt Action
  bot.action('action_search_prompt', (ctx) => {
    ctx.answerCbQuery();
    const lang = db.getUserLang(ctx.from.id);
    ctx.reply(
      lang === 'am'
        ? `🔍 *እቃዎችን በስም ይፈልጉ*\n\nየሚፈልጉትን እቃ ስም ይጻፉ (ለምሳሌ፡ *ሙዝ*, *ወተት*, *ዘይት*, *ዳቦ*):`
        : `🔍 *Search the Minimarket*\n\nSimply type the name of the product you are looking for (e.g. *Milk*, *Oil*, *Bread*, *Banana*):`,
      { parse_mode: 'Markdown' }
    );
  });
}

/**
 * Helper to display the user's shopping cart with Promo Discount support
 */
function renderCart(ctx) {
  const userId = ctx.from.id;
  const lang = db.getUserLang(userId);
  const cart = db.getCart(userId);
  const session = db.getCheckoutSession(userId);
  const appliedPromo = session?.appliedPromo || null;

  if (cart.items.length === 0) {
    const text =
      `🛒 *${t(lang, 'cart_title')}*\n\n` +
      `${t(lang, 'cart_empty')}`;

    if (ctx.callbackQuery) {
      return ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...emptyCartKeyboard(lang),
      }).catch(() => ctx.reply(text, { parse_mode: 'Markdown', ...emptyCartKeyboard(lang) }));
    }
    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...emptyCartKeyboard(lang),
    });
  }

  const deliveryFee = 50;
  let discountAmount = 0;

  if (appliedPromo) {
    // Re-verify promo still valid for current cart subtotal and user
    const check = db.validatePromoCode(userId, appliedPromo.code, cart.total);
    if (check.valid) {
      discountAmount = check.discount;
      appliedPromo.discount = discountAmount;
    } else {
      delete session.appliedPromo;
    }
  }

  const grandTotal = Math.max(0, cart.total - discountAmount + deliveryFee);

  let text = `🛒 *${t(lang, 'cart_title')}* (${cart.itemCount} items)\n\n`;
  cart.items.forEach((item, index) => {
    text += `${index + 1}. *${item.product.name}*\n`;
    text += `   ${item.quantity} × ${item.product.price} = *${item.itemTotal} ${config.currency}*\n`;
  });

  text += `\n─────────────────────\n`;
  text += `💰 *${t(lang, 'subtotal')}:* ${cart.total} ${config.currency}\n`;
  text += `🛵 *${t(lang, 'delivery_fee')}:* ${deliveryFee} ${config.currency}\n`;

  if (appliedPromo && discountAmount > 0) {
    text += `🏷️ *${t(lang, 'discount')} (${appliedPromo.code}):* -${discountAmount} ${config.currency}\n`;
  }

  text += `💵 *${t(lang, 'grand_total')}:* *${grandTotal} ${config.currency}*\n\n`;
  text += lang === 'am'
    ? `ብዛትን ለመጨመር ወይም ለመቀነስ ከታች ያሉትን ምልክቶች ይጠቀሙ፡`
    : `Use the controls below to adjust quantities:`;

  if (ctx.callbackQuery) {
    return ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...cartManagementKeyboard(cart.items, config.currency, appliedPromo, lang),
    }).catch(() => {
      ctx.reply(text, {
        parse_mode: 'Markdown',
        ...cartManagementKeyboard(cart.items, config.currency, appliedPromo, lang),
      });
    });
  }

  return ctx.reply(text, {
    parse_mode: 'Markdown',
    ...cartManagementKeyboard(cart.items, config.currency, appliedPromo, lang),
  });
}

module.exports = {
  registerCatalogHandlers,
  renderCart,
};
