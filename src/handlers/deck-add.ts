import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { addDeck, getDecks } from "../data.js";

registerMainMenuItem({ label: "➕ Add Deck", data: "deck:add", order: 30 });

const composer = new Composer<Ctx>();

composer.callbackQuery("deck:add", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_deck_name";
  await ctx.reply("What should this deck be called?", {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: "Type a deck name…",
    },
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_deck_name") return next();
  const name = ctx.message.text.trim();
  if (name.length < 1 || name.length > 50) {
    await ctx.reply("Deck name should be 1–50 characters. Try again:");
    return;
  }
  const deck = addDeck(ctx, name);
  ctx.session.step = undefined;
  await ctx.reply(`✅ Deck "${deck.name}" created.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("➕ Add a card", `card:add:${deck.id}`)],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
