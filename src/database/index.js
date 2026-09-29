const fs = require("fs");
const path = require("path");
const { initialCategories, initialProducts } = require("./catalog");

const DATA_DIR = path.join(__dirname, "../../data");
const DB_FILE = path.join(DATA_DIR, "store.json");

const defaultPromoCodes = [
  {
    code: "WELCOME",
    type: "fixed",
    value: 50,
    minOrder: 100,
    oneTimePerUser: true,
    active: true,
    uses: 0,
    description: "Welcome Offer: 50 ETB off your first order (Single-use only)",
  },
  {
    code: "SPECIAL1000",
    type: "fixed",
    value: 100,
    minOrder: 1000,
    oneTimePerUser: false,
    active: true,
    uses: 0,
    description:
      "Special Offer: 100 ETB discount when you buy more than 1,000 ETB",
  },
  {
    code: "HAMMER50",
    type: "fixed",
    value: 50,
    minOrder: 250,
    oneTimePerUser: false,
    active: true,
    uses: 0,
    description: "50 ETB off orders over 250 ETB",
  },
];

class Database {
  constructor() {
    this.categories = [];
    this.products = [];
    this.carts = {}; // { [userId]: { [productId]: quantity } }
    this.favorites = {}; // { [userId]: [productId, ...] }
    this.orders = []; // [ { id, userId, items, total, status, ... } ]
    this.userProfiles = {}; // { [userId]: { phone, address, name, lang, usedPromos } }
    this.checkoutSessions = {}; // { [userId]: { step, address, phone, paymentMethod, promoCode, discount } }
    this.promoCodes = [];
    this.adminSessions = {};
    this.supportSessions = {};
    this.init();
  }

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const data = JSON.parse(raw);
        this.categories = data.categories || initialCategories;
        this.products = data.products || initialProducts;
        this.carts = data.carts || {};
        this.favorites = data.favorites || {};
        this.orders = data.orders || [];
        this.userProfiles = data.userProfiles || {};
        this.promoCodes = data.promoCodes || [];

        // Ensure default offers are present and updated with business rules
        defaultPromoCodes.forEach((def) => {
          const found = this.promoCodes.find(
            (p) => p.code.toUpperCase() === def.code,
          );
          if (!found) {
            this.promoCodes.push({ ...def });
          } else {
            found.oneTimePerUser = def.oneTimePerUser;
            found.minOrder = def.minOrder;
            found.value = def.value;
            found.description = def.description;
          }
        });

        this.checkoutSessions = {};
        return;
      } catch (err) {
        console.warn(
          "⚠️ Could not parse existing store.json, reinitializing from catalog seeds.",
        );
      }
    }

    // Default initialization
    this.categories = [...initialCategories];
    this.products = [...initialProducts];
    this.carts = {};
    this.favorites = {};
    this.orders = [];
    this.userProfiles = {};
    this.promoCodes = [...defaultPromoCodes];
    this.checkoutSessions = {};
    this.save();
  }

  save() {
    try {
      const data = {
        categories: this.categories,
        products: this.products,
        carts: this.carts,
        favorites: this.favorites,
        orders: this.orders,
        userProfiles: this.userProfiles,
        promoCodes: this.promoCodes,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("❌ Failed to save store.json:", err.message);
    }
  }

  // --- Language Operations ---
  getUserLang(userId) {
    return this.userProfiles[userId]?.lang || "en";
  }

  setUserLang(userId, lang) {
    const validLang = lang === "am" ? "am" : "en";
    this.saveUserProfile(userId, { lang: validLang });
    return validLang;
  }

  // --- Category Operations ---
  getCategories() {
    return this.categories;
  }

  getCategoryById(categoryId) {
    return this.categories.find((c) => c.id === categoryId);
  }

  // --- Product Operations ---
  getProductsByCategory(categoryId) {
    return this.products.filter((p) => p.categoryId === categoryId);
  }

  getProductById(productId) {
    return this.products.find((p) => p.id === productId);
  }

  searchProducts(query) {
    if (!query || typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    return this.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }

  // --- Cart Operations ---
  getCart(userId) {
    const userCart = this.carts[userId] || {};
    const items = [];
    let total = 0;
    let itemCount = 0;

    for (const [productId, quantity] of Object.entries(userCart)) {
      const product = this.getProductById(productId);
      if (product && quantity > 0) {
        const itemTotal = product.price * quantity;
        total += itemTotal;
        itemCount += quantity;
        items.push({
          product,
          quantity,
          itemTotal,
        });
      }
    }

    return {
      items,
      itemCount,
      total,
    };
  }

  addToCart(userId, productId, qty = 1) {
    if (!this.carts[userId]) {
      this.carts[userId] = {};
    }
    const current = this.carts[userId][productId] || 0;
    this.carts[userId][productId] = current + qty;
    this.save();
    return this.getCart(userId);
  }

  updateCartQuantity(userId, productId, delta) {
    if (!this.carts[userId] || !this.carts[userId][productId]) {
      return this.getCart(userId);
    }
    const nextQty = this.carts[userId][productId] + delta;
    if (nextQty <= 0) {
      delete this.carts[userId][productId];
    } else {
      this.carts[userId][productId] = nextQty;
    }
    this.save();
    return this.getCart(userId);
  }

  clearCart(userId) {
    this.carts[userId] = {};
    this.save();
    return { items: [], itemCount: 0, total: 0 };
  }

  // --- Favorites Operations ---
  getFavorites(userId) {
    const list = this.favorites[userId] || [];
    return list.map((id) => this.getProductById(id)).filter(Boolean);
  }

  isFavorite(userId, productId) {
    const list = this.favorites[userId] || [];
    return list.includes(productId);
  }

  toggleFavorite(userId, productId) {
    if (!this.favorites[userId]) {
      this.favorites[userId] = [];
    }
    const index = this.favorites[userId].indexOf(productId);
    let isFav = false;
    if (index > -1) {
      this.favorites[userId].splice(index, 1);
      isFav = false;
    } else {
      this.favorites[userId].push(productId);
      isFav = true;
    }
    this.save();
    return isFav;
  }

  // --- User Profiles ---
  getUserProfile(userId) {
    return this.userProfiles[userId] || null;
  }

  saveUserProfile(userId, data) {
    const current = this.userProfiles[userId] || {};
    this.userProfiles[userId] = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.userProfiles[userId];
  }

  // --- Checkout Session State ---
  getCheckoutSession(userId) {
    return this.checkoutSessions[userId] || null;
  }

  setCheckoutSession(userId, data) {
    const current = this.checkoutSessions[userId] || {};
    this.checkoutSessions[userId] = {
      ...current,
      ...data,
    };
    return this.checkoutSessions[userId];
  }

  clearCheckoutSession(userId) {
    delete this.checkoutSessions[userId];
  }

  // --- Promo Codes Engine ---
  getPromoCodes() {
    return this.promoCodes;
  }

  getPromoCode(code) {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    return this.promoCodes.find((p) => p.code.toUpperCase() === clean);
  }

  hasUserUsedPromo(userId, code) {
    if (!userId || !code) return false;
    const clean = code.trim().toUpperCase();

    // 1. Check user profile usedPromos array
    const profile = this.getUserProfile(userId);
    if (profile?.usedPromos && profile.usedPromos.includes(clean)) {
      return true;
    }

    // 2. Check past orders placed by this user
    const orders = this.getUserOrders(userId);
    return orders.some(
      (o) =>
        o.promoCode &&
        o.promoCode.toUpperCase() === clean &&
        o.status !== "cancelled",
    );
  }

  validatePromoCode(userId, code, subtotal) {
    const promo = this.getPromoCode(code);
    if (!promo) {
      return { valid: false, message: "Invalid promo code." };
    }
    if (!promo.active) {
      return {
        valid: false,
        message: "This promo code is currently inactive.",
      };
    }

    // Rule 1: Welcome offer works only once per customer
    if (promo.oneTimePerUser && this.hasUserUsedPromo(userId, promo.code)) {
      return {
        valid: false,
        message:
          `⚠️ *Welcome Offer is single-use only!*\n\n` +
          `You have already redeemed the welcome discount "${promo.code}" on a previous order. This offer is valid only once per customer.`,
      };
    }

    // Rule 2: Special offer customer buy more than 1000 birr
    if (subtotal < promo.minOrder) {
      const remaining = promo.minOrder - subtotal;
      if (promo.minOrder >= 1000) {
        return {
          valid: false,
          message:
            `🌟 *Special Offer Qualification:*\n\n` +
            `This special discount is for customers who buy *more than 1,000 ETB*!\n` +
            `• Current Cart: *${subtotal} ETB*\n` +
            `• Needed to Unlock: *${remaining} ETB more*\n\n` +
            `_Add a few more groceries to unlock your ${promo.value} ETB special discount!_`,
        };
      }
      return {
        valid: false,
        message: `⚠️ This promo requires a minimum purchase of ${promo.minOrder} ETB (Current cart: ${subtotal} ETB). Add ${remaining} ETB more to qualify.`,
      };
    }

    let discount = 0;
    if (promo.type === "fixed") {
      discount = promo.value;
    } else if (promo.type === "percent") {
      discount = Math.round((subtotal * promo.value) / 100);
    }

    // Do not discount more than subtotal
    discount = Math.min(discount, subtotal);

    let successMsg = `🎉 Promo code *${promo.code}* applied! Saved *${discount} ETB*.`;
    if (promo.code === "SPECIAL1000") {
      successMsg = `🌟 *Special Offer Applied!*\nThank you for shopping over 1,000 ETB! You received a *${discount} ETB discount*.`;
    } else if (promo.code === "WELCOME") {
      successMsg = `🎁 *Welcome Offer Applied!*\nYou saved *${discount} ETB* on your first order. Enjoy shopping with Hammer Shop!`;
    }

    return {
      valid: true,
      promo,
      discount,
      message: successMsg,
    };
  }

  createPromoCode({
    code,
    type = "fixed",
    value,
    minOrder = 0,
    oneTimePerUser = false,
    description = "",
  }) {
    const cleanCode = code.trim().toUpperCase();
    const existing = this.getPromoCode(cleanCode);
    if (existing) {
      existing.type = type;
      existing.value = Number(value);
      existing.minOrder = Number(minOrder);
      existing.oneTimePerUser = Boolean(oneTimePerUser);
      existing.description = description;
      existing.active = true;
      this.save();
      return existing;
    }

    const newPromo = {
      code: cleanCode,
      type,
      value: Number(value),
      minOrder: Number(minOrder),
      oneTimePerUser: Boolean(oneTimePerUser),
      active: true,
      uses: 0,
      description,
      createdAt: new Date().toISOString(),
    };
    this.promoCodes.push(newPromo);
    this.save();
    return newPromo;
  }

  togglePromoCode(code) {
    const promo = this.getPromoCode(code);
    if (!promo) return null;
    promo.active = !promo.active;
    this.save();
    return promo.active;
  }

  // --- Orders Operations ---
  createOrder({
    userId,
    customerName,
    phone,
    deliveryAddress,
    items,
    subtotal,
    deliveryFee,
    total,
    paymentMethod,
    discount = 0,
    promoCode = null,
  }) {
    const orderNumber = 1000 + this.orders.length + 1;
    const orderId = `MM-${orderNumber}`;

    const newOrder = {
      id: orderId,
      userId,
      customerName: customerName || "Valued Customer",
      phone,
      deliveryAddress,
      items,
      subtotal,
      deliveryFee,
      discount,
      promoCode,
      total,
      paymentMethod,
      status: "pending", // pending -> confirmed -> preparing -> out_for_delivery -> delivered -> cancelled
      paymentReference: null,
      paymentProviderStatus: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Increment promo usage and track user single-use promos
    if (promoCode) {
      const p = this.getPromoCode(promoCode);
      if (p) {
        p.uses = (p.uses || 0) + 1;
      }
      const profile = this.getUserProfile(userId) || {};
      const usedPromos = profile.usedPromos || [];
      if (!usedPromos.includes(promoCode.toUpperCase())) {
        usedPromos.push(promoCode.toUpperCase());
        this.saveUserProfile(userId, { usedPromos });
      }
    }

    this.orders.unshift(newOrder); // newest first
    this.save();

    // Auto-update user profile with verified phone and address
    this.saveUserProfile(userId, {
      name: customerName,
      phone,
      address: deliveryAddress,
    });

    return newOrder;
  }

  getUserOrders(userId) {
    return this.orders.filter((o) => o.userId === userId);
  }

  getOrderById(orderId) {
    return this.orders.find((o) => o.id === orderId);
  }

  updateOrderStatus(orderId, newStatus) {
    const order = this.getOrderById(orderId);
    if (!order) return null;
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    this.save();
    return order;
  }

  getAllOrders(statusFilter) {
    if (!statusFilter) return this.orders;
    return this.orders.filter((o) => o.status === statusFilter);
  }

  // --- Product Management (Phase 11) ---
  addProduct({ categoryId, name, price, unit, description, inStock = true }) {
    const id = `prod_${Date.now()}`;
    const newProduct = {
      id,
      categoryId,
      name,
      price: Number(price),
      unit: unit || "1 item",
      description: description || "",
      inStock: Boolean(inStock),
      createdAt: new Date().toISOString(),
    };
    this.products.push(newProduct);
    this.save();
    return newProduct;
  }

  updateProduct(productId, updates) {
    const product = this.getProductById(productId);
    if (!product) return null;
    Object.assign(product, updates);
    this.save();
    return product;
  }

  toggleProductStock(productId) {
    const product = this.getProductById(productId);
    if (!product) return null;
    product.inStock = !product.inStock;
    this.save();
    return product.inStock;
  }

  deleteProduct(productId) {
    const index = this.products.findIndex((p) => p.id === productId);
    if (index === -1) return false;
    this.products.splice(index, 1);
    this.save();
    return true;
  }

  // --- Admin Sessions (Phase 11) ---
  getAdminSession(adminId) {
    return this.adminSessions ? this.adminSessions[adminId] : null;
  }

  setAdminSession(adminId, data) {
    if (!this.adminSessions) this.adminSessions = {};
    this.adminSessions[adminId] = {
      ...(this.adminSessions[adminId] || {}),
      ...data,
    };
    return this.adminSessions[adminId];
  }

  clearAdminSession(adminId) {
    if (this.adminSessions) {
      delete this.adminSessions[adminId];
    }
  }

  // --- Customer Support Sessions (Phase 10) ---
  getSupportSession(userId) {
    return this.supportSessions ? this.supportSessions[userId] : null;
  }

  setSupportSession(userId, data) {
    if (!this.supportSessions) this.supportSessions = {};
    this.supportSessions[userId] = {
      ...(this.supportSessions[userId] || {}),
      ...data,
    };
    return this.supportSessions[userId];
  }

  clearSupportSession(userId) {
    if (this.supportSessions) {
      delete this.supportSessions[userId];
    }
  }

  // --- Customer Broadcasts (Phase 11) ---
  getAllCustomerIds() {
    const ids = new Set();
    this.orders.forEach((o) => ids.add(o.userId));
    Object.keys(this.userProfiles).forEach((id) => ids.add(Number(id)));
    Object.keys(this.carts).forEach((id) => ids.add(Number(id)));
    return Array.from(ids);
  }

  // --- Store Sales Analytics (Phase 12) ---
  getSalesAnalytics(period = "today") {
    const now = new Date();
    let filteredOrders = this.orders;

    if (period === "today") {
      const todayStr = now.toISOString().split("T")[0];
      filteredOrders = this.orders.filter((o) =>
        o.createdAt.startsWith(todayStr),
      );
    } else if (period === "week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredOrders = this.orders.filter(
        (o) => new Date(o.createdAt) >= oneWeekAgo,
      );
    }

    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(
      (o) => o.status === "delivered",
    );
    const pendingOrders = filteredOrders.filter(
      (o) =>
        o.status === "pending" ||
        o.status === "awaiting_payment" ||
        o.status === "preparing" ||
        o.status === "out_for_delivery",
    );
    const cancelledOrders = filteredOrders.filter(
      (o) => o.status === "cancelled" || o.status === "payment_rejected",
    );

    let totalRevenue = 0;
    const paymentBreakdown = {
      "Cash on Delivery": 0,
      Telebirr: 0,
      "CBE Birr / Bank Transfer": 0,
    };
    const productSales = {};

    filteredOrders.forEach((o) => {
      if (o.status !== "cancelled" && o.status !== "payment_rejected") {
        totalRevenue += o.total;
        paymentBreakdown[o.paymentMethod] =
          (paymentBreakdown[o.paymentMethod] || 0) + o.total;

        o.items.forEach((item) => {
          const name = item.product.name;
          productSales[name] = (productSales[name] || 0) + item.quantity;
        });
      }
    });

    const averageOrderValue =
      totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Top selling products
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    return {
      period,
      totalOrders,
      completedOrders: completedOrders.length,
      pendingOrders: pendingOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalRevenue,
      averageOrderValue,
      paymentBreakdown,
      topProducts,
    };
  }
}

// Singleton database instance
const db = new Database();

module.exports = db;
