import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { addCard, getDeck, getCardsForDeck } from "../data.js";

const composer = new Composer<Ctx>();

composer.callbackQuery(/^card:add:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const deckId = ctx.match[1];
  if (ctx.session.reviewSession) {
    await ctx.editMessageText("Finish your current review session before adding cards.", {
      reply_markup: inlineKeyboard([
        [inlineButton("▶️ Resume review", "review:resume")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  const deck = getDeck(ctx, deckId);
  if (!deck) {
    await ctx.editMessageText("Deck not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  ctx.session.step = "awaiting_card_front";
  ctx.session.addCardDeckId = deckId;
  await ctx.reply(`Adding a card to "${deck.name}"\n\nWhat's the word or phrase?`, {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: "Type the word or phrase…",
    },
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_card_front") return next();
  const front = ctx.message.text.trim();
  if (front.length < 1 || front.length > 200) {
    await ctx.reply("Keep it under 200 characters. Try again:");
    return;
  }
  ctx.session.cardFront = front;
  ctx.session.step = "awaiting_card_back";
  await ctx.reply("What's the translation or definition?", {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: "Type the translation…",
    },
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_card_back") return next();
  const back = ctx.message.text.trim();
  if (back.length < 1 || back.length > 200) {
    await ctx.reply("Keep it under 200 characters. Try again:");
    return;
  }
  ctx.session.cardBack = back;
  ctx.session.step = "awaiting_card_example";
  await ctx.reply("Add an example sentence? (or tap Skip to finish)", {
    reply_markup: inlineKeyboard([
      [inlineButton("Skip", "card:skip_example")],
    ]),
  });
});

composer.callbackQuery("card:skip_example", async (ctx) => {
  await ctx.answerCallbackQuery();
  await saveCard(ctx, "");
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_card_example") return next();
  const example = ctx.message.text.trim();
  await saveCard(ctx, example);
});

async function saveCard(ctx: Ctx, example: string): Promise<void> {
  const { addCard: addCardFn } = await import("../data.js");
  const deckId = ctx.session.addCardDeckId;
  const front = ctx.session.cardFront;
  const back = ctx.session.cardBack;
  if (!deckId || !front || !back) {
    ctx.session.step = undefined;
    ctx.session.addCardDeckId = undefined;
    ctx.session.cardFront = undefined;
    ctx.session.cardBack = undefined;
    ctx.session.cardExample = undefined;
    await ctx.reply("Something went wrong. Start over from the menu.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const deck = getDeck(ctx, deckId);
  addCardFn(ctx, deckId, front, back, example);
  ctx.session.step = undefined;
  ctx.session.addCardDeckId = undefined;
  ctx.session.cardFront = undefined;
  ctx.session.cardBack = undefined;
  ctx.session.cardExample = undefined;
  const cardCount = getCardsForDeck(ctx, deckId).length;
  await ctx.reply(`✅ Card added — "${front}" is card #${cardCount} in ${deck?.name ?? "the deck"}.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("➕ Add another", `card:add:${deckId}`)],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
}

export default composer;
