import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getUserSettings, updateUserSettings } from "../data.js";

registerMainMenuItem({ label: "🔢 Daily Limit", data: "settings:new_card_limit", order: 50 });

const composer = new Composer<Ctx>();

composer.callbackQuery("settings:new_card_limit", async (ctx) => {
  await ctx.answerCallbackQuery();
  const settings = getUserSettings(ctx);
  ctx.session.step = "awaiting_new_card_limit";
  await ctx.editMessageText(
    `Current daily new-card limit: ${settings.dailyNewCardLimit}\n\nHow many new cards per day?`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("5", "settings:set_limit:5"), inlineButton("10", "settings:set_limit:10")],
        [inlineButton("20", "settings:set_limit:20"), inlineButton("30", "settings:set_limit:30")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery(/^settings:set_limit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const limit = parseInt(ctx.match[1]);
  if (limit < 1 || limit > 100) {
    await ctx.reply("Please pick a number between 1 and 100.");
    return;
  }
  updateUserSettings(ctx, { dailyNewCardLimit: limit });
  ctx.session.step = undefined;
  await ctx.editMessageText(`✅ Daily new-card limit set to ${limit}.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_new_card_limit") return next();
  const text = ctx.message.text.trim();
  const limit = parseInt(text);
  if (isNaN(limit) || limit < 1 || limit > 100) {
    await ctx.reply("Please enter a number between 1 and 100:");
    return;
  }
  updateUserSettings(ctx, { dailyNewCardLimit: limit });
  ctx.session.step = undefined;
  await ctx.reply(`✅ Daily new-card limit set to ${limit}.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
