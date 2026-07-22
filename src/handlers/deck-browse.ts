import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getDecks, getCardsForDeck, deleteDeck, getDueCards, now } from "../data.js";

registerMainMenuItem({ label: "📚 Decks", data: "deck:browse", order: 20 });

const composer = new Composer<Ctx>();

function deckListText(ctx: Ctx): string {
  const decks = getDecks(ctx);
  if (decks.length === 0) {
    return "📚 No decks yet — tap Create Deck to add one.";
  }
  const lines = ["📚 Your decks", ""];
  for (const deck of decks) {
    const cards = getCardsForDeck(ctx, deck.id);
    const due = getDueCards(ctx, deck.id, now()).length;
    lines.push(`${deck.name} — ${cards.length} cards, ${due} due`);
  }
  return lines.join("\n");
}

function deckListKeyboard(ctx: Ctx) {
  const decks = getDecks(ctx);
  const rows = decks.map((deck) => [
    inlineButton(deck.name, `deck:view:${deck.id}`),
  ]);
  rows.push([inlineButton("➕ Create Deck", "deck:add")]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  return inlineKeyboard(rows);
}

composer.callbackQuery("deck:browse", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(deckListText(ctx), {
    reply_markup: deckListKeyboard(ctx),
  });
});

composer.callbackQuery(/^deck:view:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const deckId = ctx.match[1];
  const { getDeck } = await import("../data.js");
  const deck = getDeck(ctx, deckId);
  if (!deck) {
    await ctx.editMessageText("That deck wasn't found. Tap Browse Decks to try again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const cards = getCardsForDeck(ctx, deckId);
  const due = getDueCards(ctx, deckId, now()).length;
  const lines = [
    `📁 ${deck.name}`,
    `${cards.length} cards, ${due} due`,
  ];
  const rows = [
    [inlineButton("➕ Add a card", `card:add:${deckId}`)],
    [inlineButton("🗑 Remove deck", `deck:confirm_delete:${deckId}`)],
    [inlineButton("⬅️ Back to decks", "deck:browse")],
  ];
  await ctx.editMessageText(lines.join("\n"), {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^deck:confirm_delete:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const deckId = ctx.match[1];
  await ctx.editMessageText("Remove this deck and all its cards?", {
    reply_markup: inlineKeyboard([
      [
        inlineButton("🗑 Yes, remove", `deck:delete:${deckId}`),
        inlineButton("Cancel", `deck:view:${deckId}`),
      ],
    ]),
  });
});

composer.callbackQuery(/^deck:delete:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const deckId = ctx.match[1];
  deleteDeck(ctx, deckId);
  await ctx.editMessageText("Deck removed.", {
    reply_markup: deckListKeyboard(ctx),
  });
});

export default composer;
