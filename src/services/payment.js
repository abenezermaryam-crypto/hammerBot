const config = require("../config/env");

function isPaymentProviderConfigured() {
  const mode = (process.env.PAYMENT_PROVIDER_MODE || "").toLowerCase();
  const baseUrl = (process.env.PAYMENT_PROVIDER_BASE_URL || "").trim();
  const apiKey = (process.env.PAYMENT_PROVIDER_API_KEY || "").trim();

  if (mode === "mock") return true;
  return Boolean(mode && baseUrl && apiKey);
}

function getProviderConfig() {
  return {
    mode: (process.env.PAYMENT_PROVIDER_MODE || "mock").toLowerCase(),
    baseUrl: (process.env.PAYMENT_PROVIDER_BASE_URL || "").replace(/\/$/, ""),
    apiKey: (process.env.PAYMENT_PROVIDER_API_KEY || "").trim(),
    secret: (process.env.PAYMENT_PROVIDER_SECRET || "").trim(),
  };
}

function buildReference(order) {
  return `MM-${order.id}-${Date.now()}`;
}

async function createPaymentSession(order) {
  const provider = getProviderConfig();

  if (!isPaymentProviderConfigured()) {
    return {
      enabled: false,
      autoConfirm: false,
      reference: buildReference(order),
      status: "PENDING",
      message:
        "No official payment provider configured yet. Manual payment review is active.",
    };
  }

  if (provider.mode === "mock") {
    return {
      enabled: true,
      autoConfirm: true,
      reference: buildReference(order),
      status: "SUCCESS",
      message: "Demo payment provider accepted the payment reference.",
    };
  }

  try {
    const response = await fetch(`${provider.baseUrl}/api/payments/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
        "X-Provider-Secret": provider.secret,
      },
      body: JSON.stringify({
        merchant: "Hammer Shop",
        orderId: order.id,
        amount: Number(order.total),
        currency: config.currency,
        reference: buildReference(order),
        paymentMethod: order.paymentMethod,
        customerId: String(order.userId),
      }),
    });

    if (!response.ok) {
      throw new Error(`payment provider init failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      enabled: true,
      autoConfirm: Boolean(
        data?.status === "SUCCESS" || data?.success === true,
      ),
      reference: data?.reference || buildReference(order),
      status: data?.status || "PENDING",
      providerUrl: data?.checkoutUrl || null,
      message: data?.message || "Payment reference created successfully.",
    };
  } catch (error) {
    return {
      enabled: false,
      autoConfirm: false,
      reference: buildReference(order),
      status: "PENDING",
      message: `Payment provider connection failed: ${error.message}`,
    };
  }
}

async function verifyPayment(reference) {
  const provider = getProviderConfig();

  if (!isPaymentProviderConfigured()) {
    return {
      enabled: false,
      status: "PENDING",
      message: "No configured payment provider to verify against.",
    };
  }

  if (provider.mode === "mock") {
    return {
      enabled: true,
      status: "SUCCESS",
      reference,
      message: "Mock payment provider confirmed the payment.",
    };
  }

  try {
    const response = await fetch(`${provider.baseUrl}/api/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
        "X-Provider-Secret": provider.secret,
      },
      body: JSON.stringify({ reference }),
    });

    if (!response.ok) {
      throw new Error(`payment provider verify failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      enabled: true,
      status: data?.status || "PENDING",
      reference: data?.reference || reference,
      amount: data?.amount || null,
      message: data?.message || "Payment verification completed.",
    };
  } catch (error) {
    return {
      enabled: true,
      status: "PENDING",
      reference,
      message: `Verification unavailable: ${error.message}`,
    };
  }
}

module.exports = {
  isPaymentProviderConfigured,
  createPaymentSession,
  verifyPayment,
};
