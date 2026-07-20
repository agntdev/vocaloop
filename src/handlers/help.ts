import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const HELP =
  "📖 How to use VocabSRS:\n\n" +
  "1. Create a deck to organize your words\n" +
  "2. Add cards with a word, translation, and optional example\n" +
  "3. Tap Start Reviews to study — rate each card to schedule your next review\n\n" +
  "The bot remembers your progress and shows cards right before you forget them.";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("help", async (ctx) => {
  await ctx.reply(HELP);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(HELP, { reply_markup: backToMenu });
});

export default composer;
