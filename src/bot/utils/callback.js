const EXPIRED_CALLBACK_QUERY =
  /query is too old|response timeout expired|query ID is invalid/i;

async function answerCallbackQuery(ctx, ...args) {
  try {
    return await ctx.answerCbQuery(...args);
  } catch (error) {
    logCallbackAnswerError(error);
  }
}

function protectCallbackQuery(ctx) {
  const answerCbQuery = ctx.answerCbQuery.bind(ctx);
  ctx.answerCbQuery = (...args) => {
    try {
      return Promise.resolve(answerCbQuery(...args)).catch(
        logCallbackAnswerError,
      );
    } catch (error) {
      logCallbackAnswerError(error);
      return Promise.resolve();
    }
  };
}

function logCallbackAnswerError(error) {
  const description =
    error?.response?.description || error?.message || String(error);
  if (!EXPIRED_CALLBACK_QUERY.test(description)) {
    console.warn("Could not answer callback query:", description);
  }
}

module.exports = { answerCallbackQuery, protectCallbackQuery };
