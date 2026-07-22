import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getUserSettings, getDecks, getTotalCardsCount, getLearnedCardsCount, getDueCards, now } from "../data.js";

registerMainMenuItem({ label: "📊 Stats", data: "stats:show", order: 45 });

const composer = new Composer<Ctx>();

function statsText(ctx: Ctx): string {
  const settings = getUserSettings(ctx);
  const decks = getDecks(ctx);
  const totalCards = getTotalCardsCount(ctx);
  const learnedCards = getLearnedCardsCount(ctx);
  const currentTime = now();
  let dueCount = 0;
  for (const deck of decks) {
    dueCount += getDueCards(ctx, deck.id, currentTime).length;
  }

  const lines = [
    "📊 Your progress",
    "",
    `Decks: ${decks.length}`,
    `Total cards: ${totalCards}`,
    `Learned: ${learnedCards}`,
    `Due today: ${dueCount}`,
    `Daily new-card limit: ${settings.dailyNewCardLimit}`,
  ];
  return lines.join("\n");
}

composer.command("stats", async (ctx) => {
  await ctx.reply(statsText(ctx), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

composer.callbackQuery("stats:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(statsText(ctx), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
