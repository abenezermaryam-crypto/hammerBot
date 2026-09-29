const { createBot } = require('./bot');

const bot = createBot();

bot.launch()
  .then(() => console.log('✅ Minimarket bot is running (Phase 2)'))
  .catch((err) => {
    console.error('❌ Failed to launch bot:', err.message);
    process.exit(1);
  });

// Graceful shutdown handling
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
