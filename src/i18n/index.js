/**
 * Bilingual localization dictionary for Hammer Shop (English & Amharic)
 */

const strings = {
  en: {
    // Menu Buttons
    btn_products: '🛍️ Browse Products',
    btn_cart: '🛒 My Cart',
    btn_orders: '📦 My Orders',
    btn_favorites: '❤️ Favorites',
    btn_search: '🔎 Search Products',
    btn_support: '💬 Help & Support',
    btn_lang: '🌐 ቋንቋ / Language',

    // Welcome & General
    welcome_title: 'Welcome to Hammer Shop',
    welcome_sub: 'Your neighborhood minimarket in Hawassa, now on Telegram.\nFresh groceries delivered to your door in 30–45 minutes.',
    choose_option: 'Please choose an option from the menu below to get started:',

    // Catalog & Categories
    catalog_title: 'Hammer Shop Catalog',
    catalog_sub: 'Select a department below to explore available items:\nAll items are fresh and locally stocked daily.',
    add_to_cart: '➕ Add to Cart',
    added_to_cart: '✅ Added to cart!',
    in_stock: 'In Stock',
    out_of_stock: 'Out of Stock',
    all_categories: '🛍️ All Categories',
    view_cart: '🛒 View Cart',

    // Cart
    cart_title: 'Your Shopping Cart',
    cart_empty: 'Your cart is currently empty.\nBrowse our departments and pick fresh groceries to add them here!',
    subtotal: 'Subtotal',
    delivery_fee: 'Estimated Delivery',
    discount: 'Promo Discount',
    grand_total: 'Grand Total',
    proceed_checkout: '💳 Proceed to Checkout',
    clear_cart: '🗑️ Clear Cart',
    apply_promo: '🏷️ Apply Promo Code',
    promo_applied: '🎉 Promo code applied! You saved',

    // Checkout
    checkout_step1: 'Step 1 of 3: Delivery Address',
    checkout_address_prompt: 'Where should we deliver your order?\n• Type your neighborhood or street (e.g. Tabor, Referral, Piazza)\n• Or tap the button below to share your exact GPS pin.',
    checkout_step2: 'Step 2 of 3: Phone Number',
    checkout_phone_prompt: 'Please share your contact phone number so our delivery driver can reach you:',
    checkout_step3: 'Step 3 of 3: Payment Method',
    pay_cod: '💵 Cash on Delivery (Pay at Door)',
    pay_telebirr: '📱 Telebirr',
    pay_cbe: '🏦 CBE Birr / CBE SuperApp',
    order_review: 'Order Summary & Review',
    confirm_order: '✅ Confirm & Place Order',
    order_placed: '🎉 Order Successfully Placed!',

    // Orders & Tracking
    my_orders_title: 'My Orders & Delivery Tracking',
    no_orders: 'You haven\'t placed any orders yet.\nYour orders and driver tracking will appear right here!',
    order_status: 'Status',
    placed_at: 'Placed at',
    refresh_status: '🔄 Refresh Status',

    // Support
    support_title: 'Help & Customer Support',
    support_location: 'Location',
    support_hours: 'Working Hours',
    support_phone: 'Phone',
    faqs: '❓ FAQs',
    send_feedback: '✍️ Send Feedback',
  },

  am: {
    // Menu Buttons
    btn_products: '🛍️ እቃዎችን ይመልከቱ',
    btn_cart: '🛒 የእኔ ጋሪ',
    btn_orders: '📦 ትዕዛዞቼ',
    btn_favorites: '❤️ ተወዳጆች',
    btn_search: '🔎 እቃ ይፈልጉ',
    btn_support: '💬 እርዳታ እና ድጋፍ',
    btn_lang: '🌐 ቋንቋ / Language',

    // Welcome & General
    welcome_title: 'እንኳን ወደ ሃመር ሾፕ በደህና መጡ',
    welcome_sub: 'የሃዋሳ ከተማ ተመራጭ የሰፈር ሚኒማርኬት በቴሌግራም።\nትኩስ እና ጥራት ያላቸው እቃዎች በ 30–45 ደቂቃ ውስጥ እስከ በርዎ ይደርሳሉ።',
    choose_option: 'ለመጀመር እባክዎ ከታች ካሉት አማራጮች አንዱን ይምረጡ፡',

    // Catalog & Categories
    catalog_title: 'የሃመር ሾፕ እቃዎች ዝርዝር',
    catalog_sub: 'እቃዎችን ለመመልከት እባክዎ ከታች ያለውን ክፍል ይምረጡ፡\nሁሉም እቃዎች በየቀኑ ትኩስ ሆነው የሚቀርቡ ናቸው።',
    add_to_cart: '➕ ወደ ጋሪ ጨምር',
    added_to_cart: '✅ ወደ ጋሪ ተጨምሯል!',
    in_stock: 'አለ (በክምችት ላይ)',
    out_of_stock: 'አልቋል',
    all_categories: '🛍️ ሁሉም ክፍሎች',
    view_cart: '🛒 ጋሪን ይመልከቱ',

    // Cart
    cart_title: 'የእርስዎ የግብይት ጋሪ',
    cart_empty: 'የእርስዎ ጋሪ ባዶ ነው።\nእቃዎችን ከመረጡ በኋላ እዚህ ጋሪዎ ውስጥ ያገኟቸዋል!',
    subtotal: 'የእቃዎች ዋጋ',
    delivery_fee: 'የማድረሻ ዋጋ',
    discount: 'የቅናሽ ኩፖን',
    grand_total: 'አጠቃላይ ድምር',
    proceed_checkout: '💳 እዘዝ እና አጠናቅቅ',
    clear_cart: '🗑️ ጋሪን አጽዳ',
    apply_promo: '🏷️ የቅናሽ ኩፖን አስገባ',
    promo_applied: '🎉 የቅናሽ ኩፖን ተተግብሯል! ያገኙት ቅናሽ፡',

    // Checkout
    checkout_step1: 'ደረጃ 1 ከ 3፡ የማድረሻ አድራሻ',
    checkout_address_prompt: 'እቃው የት እንዲደርስዎት ይፈልጋሉ?\n• የሰፈርዎን ወይም የህንጻዎን ስም ይጻፉ (ለምሳሌ፡ ታቦር፣ ሪፈራል፣ ፒያሳ)\n• ወይም ከታች ያለውን ቁልፍ በመንካት የጂፒኤስ (GPS) ካርታ ይላኩ።',
    checkout_step2: 'ደረጃ 2 ከ 3፡ ስልክ ቁጥር',
    checkout_phone_prompt: 'አሽከርካሪያችን ሲደርስ እንዲደውልልዎ እባክዎ ስልክ ቁጥርዎን ያስገቡ ወይም ያጋሩ፡',
    checkout_step3: 'ደረጃ 3 ከ 3፡ የክፍያ ዘዴ',
    pay_cod: '💵 እቃው ሲደርስ በጥሬ ገንዘብ',
    pay_telebirr: '📱 በቴሌብር (Telebirr)',
    pay_cbe: '🏦 በሲቢኢ ብር / ንግድ ባንክ (CBE)',
    order_review: 'የትዕዛዝ ማጠቃለያ እና ማረጋገጫ',
    confirm_order: '✅ ትዕዛዙን አረጋግጥ',
    order_placed: '🎉 ትዕዛዝዎ በተሳካ ሁኔታ ተመዝግቧል!',

    // Orders & Tracking
    my_orders_title: 'ትዕዛዞቼ እና የጉዞ ሁኔታ',
    no_orders: 'እስካሁን ምንም ትዕዛዝ አላስቀመጡም።\nእቃ ሲያዙ ሁኔታውን እና የአሽከርካሪውን ጉዞ እዚህ በቀጥታ መከታተል ይችላሉ!',
    order_status: 'የአሁኑ ሁኔታ',
    placed_at: 'የታዘዘበት ሰዓት',
    refresh_status: '🔄 አድስ',

    // Support
    support_title: 'እርዳታ እና የደንበኞች ድጋፍ',
    support_location: 'አድራሻ',
    support_hours: 'የስራ ሰዓት',
    support_phone: 'ስልክ',
    faqs: '❓ ተደጋጋሚ ጥያቄዎች',
    send_feedback: '✍️ አስተያየት ይላኩ',
  },
};

// Amharic category name mapping
const categoryTranslations = {
  produce: { name: 'ትኩስ አትክልትና ፍራፍሬ', icon: '🍎' },
  dairy_bakery: { name: 'የወተት ተዋጽኦ፣ እንቁላል እና ዳቦ', icon: '🥛' },
  beverages: { name: 'መጠጦች እና ለስላሳዎች', icon: '🥤' },
  pantry: { name: 'የጓዳ እና የታሸጉ ምግቦች', icon: '🥫' },
  snacks: { name: 'መክሰስ እና ቸኮሌቶች', icon: '🍫' },
  household: { name: 'የጽዳት እና የቤት ውስጥ እቃዎች', icon: '🧼' },
};

function t(lang, key) {
  const l = lang === 'am' ? 'am' : 'en';
  return strings[l][key] || strings['en'][key] || key;
}

function getCategoryName(categoryId, lang) {
  if (lang === 'am' && categoryTranslations[categoryId]) {
    return categoryTranslations[categoryId].name;
  }
  return null;
}

module.exports = {
  strings,
  t,
  getCategoryName,
};
