const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildTelebirrInstructions,
  buildCBEInstructions,
} = require("../src/bot/handlers/checkout");
const { escapeMarkdown } = require("../src/bot/utils/markdown");

test("payment instructions use valid Telegram Markdown and do not include unclosed emphasis markers", () => {
  const telebirr = buildTelebirrInstructions(250);
  const cbe = buildCBEInstructions(250);

  assert.doesNotMatch(telebirr, /\*127#/);
  assert.doesNotMatch(cbe, /\*847#|\*889#/);
  assert.match(telebirr, /dial 127#/i);
  assert.match(cbe, /dial 847#.*889#/i);
});

test("user-provided order details are escaped before Markdown rendering", () => {
  const address = "House * 5, Tabor";
  const itemName = "Milk * Organic";

  assert.equal(escapeMarkdown(address), "House \\* 5, Tabor");
  assert.equal(escapeMarkdown(itemName), "Milk \\* Organic");
});
