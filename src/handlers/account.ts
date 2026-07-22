import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "🗑 Account", data: "account:manage", order: 80 });

const composer = new Composer<Ctx>();

composer.callbackQuery("account:manage", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "Account settings\n\nExport your data before deleting, or delete everything now.",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("📤 Export data", "data:export")],
        [inlineButton("🗑 Delete account", "account:confirm_delete")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("account:confirm_delete", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "⚠️ This will permanently delete all your decks, cards, and settings. This cannot be undone.",
    {
      reply_markup: inlineKeyboard([
        [
          inlineButton("🗑 Yes, delete everything", "account:do_delete"),
          inlineButton("Cancel", "account:manage"),
        ],
      ]),
    },
  );
});

composer.callbackQuery("account:do_delete", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.decks = [];
  ctx.session.cards = [];
  ctx.session.userSettings = undefined;
  ctx.session.reviewSession = undefined;
  ctx.session.step = undefined;
  await ctx.editMessageText(
    "All data deleted. Tap /start to begin fresh.",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔄 Start over", "menu:main")],
      ]),
    },
  );
});

export default composer;
