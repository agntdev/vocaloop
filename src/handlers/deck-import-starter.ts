import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getDecks, addStarterDecks } from "../data.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("deck:import_starter", async (ctx) => {
  await ctx.answerCallbackQuery();
  const existing = getDecks(ctx).filter((d) => d.isStarterDeck);
  if (existing.length > 0) {
    await ctx.editMessageText("Starter decks are already imported.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  const decks = addStarterDecks(ctx);
  let cardCount = 0;
  for (const d of decks) {
    const { getCardsForDeck } = await import("../data.js");
    cardCount += getCardsForDeck(ctx, d.id).length;
  }
  const names = decks.map((d) => d.name).join(" and ");
  await ctx.editMessageText(
    `✅ Imported ${names} with ${cardCount} cards.`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("📚 Browse decks", "deck:browse")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
