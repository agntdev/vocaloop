import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import {
  getDecks,
  getCardsForDeck,
  getDueCards,
  getCard,
  updateCard,
  getUserSettings,
  getNewCardsToday,
  addCard,
} from "../data.js";
import { sm2, qualityFromButton } from "../sm2.js";

registerMainMenuItem({ label: "📝 Reviews", data: "review:start", order: 10 });

const composer = new Composer<Ctx>();

function showReviewMenu(ctx: Ctx, decks: ReturnType<typeof getDecks>, now: number): {
  text: string;
  keyboard: ReturnType<typeof inlineKeyboard>;
} {
  const decksWithDue = decks
    .map((d) => ({ deck: d, due: getDueCards(ctx, d.id, now).length }))
    .filter((d) => d.due > 0);

  if (decksWithDue.length === 0) {
    return {
      text: "🎉 All caught up — no cards due right now. Add more cards or check back later.",
      keyboard: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    };
  }

  const lines = ["📝 Choose a deck to review:"];
  const rows = decksWithDue.map((d) => [
    inlineButton(`${d.deck.name} (${d.due})`, `review:deck:${d.deck.id}`),
  ]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  return { text: lines.join("\n"), keyboard: inlineKeyboard(rows) };
}

composer.callbackQuery("review:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  const decks = getDecks(ctx);
  const now = Date.now();
  const { text, keyboard } = showReviewMenu(ctx, decks, now);
  await ctx.editMessageText(text, { reply_markup: keyboard });
});

composer.callbackQuery(/^review:deck:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const deckId = ctx.match[1];
  const now = Date.now();
  const settings = getUserSettings(ctx);
  const dueCards = getDueCards(ctx, deckId, now);
  const newCardsToday = getNewCardsToday(ctx, now);
  const limit = settings.dailyNewCardLimit;
  const newCardsInDeck = dueCards.filter((c) => c.state === "new");
  const allowedNew = Math.max(0, limit - newCardsToday);
  const newToShow = newCardsInDeck.slice(0, allowedNew);
  const reviewCards = dueCards.filter((c) => c.state !== "new");
  const cardsToShow = [...reviewCards, ...newToShow];

  if (cardsToShow.length === 0) {
    await ctx.editMessageText("No cards due in this deck right now.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to reviews", "review:start")],
      ]),
    });
    return;
  }

  ctx.session.reviewSession = {
    deckId,
    cardIds: cardsToShow.map((c) => c.id),
    currentIndex: 0,
    startTime: now,
  };

  const card = cardsToShow[0];
  await ctx.editMessageText(`Card 1 of ${cardsToShow.length}\n\n${card.front}`, {
    reply_markup: inlineKeyboard([
      [inlineButton("👁 Reveal", `review:reveal:0`)],
      [inlineButton("⏸ Pause", `review:pause`)],
    ]),
  });
});

composer.callbackQuery(/^review:reveal:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const session = ctx.session.reviewSession;
  if (!session) {
    await ctx.editMessageText("Session expired. Tap Start Reviews to begin again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const cardIdx = parseInt(ctx.match[1]);
  const cardId = session.cardIds[cardIdx];
  if (!cardId) {
    await ctx.editMessageText("Session expired. Tap Start Reviews to begin again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const card = getCard(ctx, cardId);
  if (!card) {
    await ctx.editMessageText("Card not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const lines = [
    card.front,
    "",
    "➡️ " + card.back,
  ];
  if (card.exampleSentence) {
    lines.push("", `📝 ${card.exampleSentence}`);
  }

  await ctx.editMessageText(lines.join("\n"), {
    reply_markup: inlineKeyboard([
      [
        inlineButton("Again", `review:rate:${cardIdx}:again`),
        inlineButton("Hard", `review:rate:${cardIdx}:hard`),
      ],
      [
        inlineButton("Good", `review:rate:${cardIdx}:good`),
        inlineButton("Easy", `review:rate:${cardIdx}:easy`),
      ],
    ]),
  });
});

composer.callbackQuery(/^review:rate:(\d+):(again|hard|good|easy)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const session = ctx.session.reviewSession;
  if (!session) {
    await ctx.editMessageText("Session expired. Tap Start Reviews to begin again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const cardIdx = parseInt(ctx.match[1]);
  const rating = ctx.match[2] as "again" | "hard" | "good" | "easy";
  const cardId = session.cardIds[cardIdx];
  if (!cardId) {
    await ctx.editMessageText("Session expired.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const card = getCard(ctx, cardId);
  if (!card) {
    await ctx.editMessageText("Card not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const quality = qualityFromButton(rating);
  const now = Date.now();
  const updated = sm2(quality, {
    easeFactor: card.easeFactor,
    intervalDays: card.intervalDays,
    repetitionCount: card.repetitionCount,
    dueDate: card.dueDate,
    state: card.state,
  }, now);
  updateCard(ctx, cardId, {
    ...updated,
    lastReviewed: now,
  });

  const nextIdx = cardIdx + 1;
  if (nextIdx < session.cardIds.length) {
    session.currentIndex = nextIdx;
    const nextCard = getCard(ctx, session.cardIds[nextIdx]);
    if (!nextCard) {
      await ctx.editMessageText("Card not found.", {
        reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
      });
      return;
    }
    await ctx.editMessageText(
      `Card ${nextIdx + 1} of ${session.cardIds.length}\n\n${nextCard.front}`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("👁 Reveal", `review:reveal:${nextIdx}`)],
          [inlineButton("⏸ Pause", `review:pause`)],
        ]),
      },
    );
  } else {
    ctx.session.reviewSession = undefined;
    await ctx.editMessageText("🎉 Session complete! Great work.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
  }
});

composer.callbackQuery("review:pause", async (ctx) => {
  await ctx.answerCallbackQuery();
  const session = ctx.session.reviewSession;
  if (!session) {
    await ctx.editMessageText("Session ended.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const remaining = session.cardIds.length - session.currentIndex;
  ctx.session.reviewSession = undefined;
  await ctx.editMessageText(`⏸ Paused — ${remaining} cards remaining. Tap Start Reviews to continue.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
