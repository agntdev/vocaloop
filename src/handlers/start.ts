import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard } from "../toolkit/index.js";
import { getUserSettings } from "../data.js";

const composer = new Composer<Ctx>();

const WELCOME =
  "👋 Welcome to VocabSRS!\n\n" +
  "Build your vocabulary with spaced repetition. Add word cards, organize them into decks, and review daily to remember more.";

composer.command("start", async (ctx) => {
  getUserSettings(ctx);
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
