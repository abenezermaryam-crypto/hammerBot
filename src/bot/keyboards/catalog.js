const { Markup } = require('telegraf');
const { getCategoryName } = require('../../i18n');

/**
 * Inline keyboard displaying all catalog categories in a 2-column grid.
 */
function categoriesKeyboard(categories, lang = 'en') {
  const rows = [];
  for (let i = 0; i < categories.length; i += 2) {
    const row = [];
    const cat1 = categories[i];
    const name1 = getCategoryName(cat1.id, lang) || cat1.name;
    row.push(Markup.button.callback(`${cat1.icon} ${name1}`, `cat_${cat1.id}`));

    if (i + 1 < categories.length) {
      const cat2 = categories[i + 1];
      const name2 = getCategoryName(cat2.id, lang) || cat2.name;
      row.push(Markup.button.callback(`${cat2.icon} ${name2}`, `cat_${cat2.id}`));
    }
    rows.push(row);
  }

  // Utility row at bottom: Search & Cart shortcut
  rows.push([
    Markup.button.callback(lang === 'am' ? '🔍 እቃ ይፈልጉ' : '🔍 Search Items', 'action_search_prompt'),
    Markup.button.callback(lang === 'am' ? '🛒 ጋሪን ይመልከቱ' : '🛒 View Cart', 'action_view_cart'),
  ]);

  return Markup.inlineKeyboard(rows);
}

/**
 * Inline keyboard displaying products within a selected category.
 */
function productsInCategoryKeyboard(products, categoryId, currency = 'ETB', lang = 'en') {
  const rows = [];

  // Each product button shows its name & price
  products.forEach((prod) => {
    rows.push([
      Markup.button.callback(`${prod.name} — ${prod.price} ${currency}`, `prod_${prod.id}`),
      Markup.button.callback(lang === 'am' ? `➕ ጨምር` : `➕ Add`, `quick_add_${prod.id}`),
    ]);
  });

  // Navigation row
  rows.push([
    Markup.button.callback(lang === 'am' ? '⬅️ ሁሉም ክፍሎች' : '⬅️ All Categories', 'nav_categories'),
    Markup.button.callback(lang === 'am' ? '🛒 ጋሪ' : '🛒 View Cart', 'action_view_cart'),
  ]);

  return Markup.inlineKeyboard(rows);
}

/**
 * Detailed view for an individual product.
 */
function productDetailKeyboard(product, isFav = false, categoryId, lang = 'en') {
  const favIcon = isFav
    ? (lang === 'am' ? '❤️ የተቀመጠ' : '❤️ Saved')
    : (lang === 'am' ? '🤍 ወደ ተወዳጆች' : '🤍 Add to Favorites');

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(lang === 'am' ? '🛒 ወደ ጋሪ ጨምር' : '🛒 Add to Cart', `cart_add_${product.id}`),
      Markup.button.callback(favIcon, `fav_toggle_${product.id}`),
    ],
    [
      Markup.button.callback(lang === 'am' ? '⬅️ ወደ ምድብ ተመለስ' : '⬅️ Back to Category', `cat_${categoryId || product.categoryId}`),
      Markup.button.callback(lang === 'am' ? '🛍️ ሁሉም ክፍሎች' : '🛍️ All Categories', 'nav_categories'),
    ],
  ]);
}

/**
 * Cart view keyboard with quantity adjustments, promo codes, clearing, and checkout.
 */
function cartManagementKeyboard(cartItems, currency = 'ETB', appliedPromo = null, lang = 'en') {
  const rows = [];

  // Quantity controls for each item: [ - ] [ Item Name (qty) ] [ + ]
  cartItems.forEach((item) => {
    rows.push([
      Markup.button.callback('➖', `cart_dec_${item.product.id}`),
      Markup.button.callback(`${item.product.name} (×${item.quantity})`, `prod_${item.product.id}`),
      Markup.button.callback('➕', `cart_inc_${item.product.id}`),
    ]);
  });

  // Promo Code Button Row
  if (appliedPromo) {
    rows.push([
      Markup.button.callback(`🏷️ ${appliedPromo.code}: -${appliedPromo.discount} ${currency} ✅`, 'cart_promo_active'),
      Markup.button.callback(lang === 'am' ? '❌ ሰርዝ' : '❌ Remove', 'cart_remove_promo'),
    ]);
  } else {
    rows.push([
      Markup.button.callback(lang === 'am' ? '🏷️ የቅናሽ ኩፖን አስገባ' : '🏷️ Apply Promo Code', 'cart_apply_promo'),
    ]);
  }

  // Action buttons
  rows.push([
    Markup.button.callback(lang === 'am' ? '🛍️ ተጨማሪ እቃ መርጥ' : '🛍️ Continue Shopping', 'nav_categories'),
    Markup.button.callback(lang === 'am' ? '🗑️ ጋሪን አጽዳ' : '🗑️ Clear Cart', 'cart_clear_confirm'),
  ]);
  rows.push([
    Markup.button.callback(lang === 'am' ? '💳 እዘዝ እና አጠናቅቅ' : '💳 Proceed to Checkout', 'checkout_prompt'),
  ]);

  return Markup.inlineKeyboard(rows);
}

/**
 * Search results keyboard
 */
function searchResultsKeyboard(products, currency = 'ETB', lang = 'en') {
  const rows = [];
  products.slice(0, 10).forEach((prod) => {
    rows.push([
      Markup.button.callback(`${prod.name} — ${prod.price} ${currency}`, `prod_${prod.id}`),
      Markup.button.callback(lang === 'am' ? '➕ ጨምር' : '➕ Add', `quick_add_${prod.id}`),
    ]);
  });

  rows.push([
    Markup.button.callback(lang === 'am' ? '🛍️ ሁሉንም ክፍሎች ይመልከቱ' : '🛍️ Browse All Categories', 'nav_categories'),
  ]);

  return Markup.inlineKeyboard(rows);
}

module.exports = {
  categoriesKeyboard,
  productsInCategoryKeyboard,
  productDetailKeyboard,
  cartManagementKeyboard,
  searchResultsKeyboard,
};
