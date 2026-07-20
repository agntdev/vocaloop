import { Composer } from "grammy";
import { readdirSync } from "node:fs";
import { createBot, type BotContext } from "./toolkit/index.js";

export interface UserSettings {
  dailyNewCardLimit: number;
  notificationSchedule: string;
}

export interface DeckData {
  id: string;
  name: string;
  userId: number;
  isStarterDeck: boolean;
  createdAt: number;
}

export interface CardData {
  id: string;
  deckId: string;
  front: string;
  back: string;
  exampleSentence: string;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  dueDate: number;
  lastReviewed: number;
  state: "new" | "learning" | "review" | "relearning";
  createdAt: number;
}

export interface ReviewSessionData {
  deckId: string;
  cardIds: string[];
  currentIndex: number;
  startTime: number;
}

export interface Session {
  step?: string;
  deckName?: string;
  cardFront?: string;
  cardBack?: string;
  cardExample?: string;
  addCardDeckId?: string;
  newCardLimitInput?: string;
  notifScheduleInput?: string;
  userSettings?: UserSettings;
  decks?: DeckData[];
  cards?: CardData[];
  reviewSession?: ReviewSessionData;
}

export type Ctx = BotContext<Session>;

/**
 * buildBot — assembles the bot, AUTO-LOADS every feature handler from
 * src/handlers/, then registers the global fallback. Does NOT start the bot.
 * Add a feature by creating src/handlers/<name>.ts that default-exports a grammY
 * Composer — NEVER edit this file (concurrent feature PRs would conflict).
 */
export async function buildBot(token: string) {
  const bot = createBot<Session>(token, {
    initial: () => ({}),
  });

  const dir = new URL("./handlers/", import.meta.url);
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter(
      (f) =>
        (f.endsWith(".js") || f.endsWith(".ts")) &&
        !f.endsWith(".d.ts") &&
        !f.includes(".test.") &&
        !f.includes(".spec."),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    files = []; // no handlers/ dir yet → nothing to load
  }
  for (const file of files.sort()) {
    const mod = (await import(new URL(file, dir).href)) as { default?: Composer<Ctx> };
    if (!mod.default) {
      throw new Error(`handler ${file} must default-export a grammY Composer`);
    }
    bot.use(mod.default);
  }

  bot.on("message", (ctx) => ctx.reply("Sorry, I didn't understand that. Try /help."));

  return bot;
}
