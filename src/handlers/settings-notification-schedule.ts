import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserSettings, updateUserSettings } from "../data.js";

const composer = new Composer<Ctx>();

const TIMES = [
  { label: "08:00", value: "08:00" },
  { label: "09:00", value: "09:00" },
  { label: "12:00", value: "12:00" },
  { label: "18:00", value: "18:00" },
  { label: "20:00", value: "20:00" },
];

composer.callbackQuery("settings:notification_schedule", async (ctx) => {
  await ctx.answerCallbackQuery();
  const settings = getUserSettings(ctx);
  const rows = TIMES.map((t) => [
    inlineButton(
      t.value === settings.notificationSchedule ? `✅ ${t.label}` : t.label,
      `settings:set_notif:${t.value}`,
    ),
  ]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText(
    `Current reminder time: ${settings.notificationSchedule}\n\nWhen should we remind you to review?`,
    { reply_markup: inlineKeyboard(rows) },
  );
});

composer.callbackQuery(/^settings:set_notif:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const time = ctx.match[1];
  if (!/^\d{2}:\d{2}$/.test(time)) {
    await ctx.reply("Invalid time format. Try again.");
    return;
  }
  updateUserSettings(ctx, { notificationSchedule: time });
  const settings = getUserSettings(ctx);
  const rows = TIMES.map((t) => [
    inlineButton(
      t.value === settings.notificationSchedule ? `✅ ${t.label}` : t.label,
      `settings:set_notif:${t.value}`,
    ),
  ]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText(
    `✅ Reminder set for ${time}.\n\nWhen should we remind you to review?`,
    { reply_markup: inlineKeyboard(rows) },
  );
});

export default composer;
