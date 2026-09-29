const config = require('../../config/env');

// Attaches ctx.state.isAdmin based on numeric Telegram ID
function attachAdminFlag(ctx, next) {
  ctx.state = ctx.state || {};
  ctx.state.isAdmin = ctx.from ? config.adminIds.includes(ctx.from.id) : false;
  return next();
}

// Protects admin-only routes
function requireAdmin(ctx, next) {
  if (!ctx.state?.isAdmin) {
    return ctx.reply('⛔ This command is for administrators only.');
  }
  return next();
}

module.exports = { attachAdminFlag, requireAdmin };
