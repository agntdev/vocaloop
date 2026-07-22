import type { Ctx } from "./bot.js";
import type { DeckData, CardData, UserSettings } from "./bot.js";
import { newCardScheduling } from "./sm2.js";

let clock: () => number = () => Date.now();

export function setClock(fn: () => number): void {
  clock = fn;
}

export function now(): number {
  return clock();
}

function uid(): string {
  return now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function ensureSession(ctx: Ctx): void {
  if (!ctx.session.decks) ctx.session.decks = [];
  if (!ctx.session.cards) ctx.session.cards = [];
  if (!ctx.session.userSettings) {
    ctx.session.userSettings = {
      dailyNewCardLimit: 10,
      notificationSchedule: "09:00",
    };
  }
}

export function getUserSettings(ctx: Ctx): UserSettings {
  ensureSession(ctx);
  return ctx.session.userSettings!;
}

export function updateUserSettings(ctx: Ctx, updates: Partial<UserSettings>): void {
  ensureSession(ctx);
  ctx.session.userSettings = { ...ctx.session.userSettings!, ...updates };
}

export function getDecks(ctx: Ctx): DeckData[] {
  ensureSession(ctx);
  return ctx.session.decks!;
}

export function getDeck(ctx: Ctx, deckId: string): DeckData | undefined {
  return getDecks(ctx).find((d) => d.id === deckId);
}

export function addDeck(ctx: Ctx, name: string): DeckData {
  ensureSession(ctx);
  const deck: DeckData = {
    id: uid(),
    name,
    userId: ctx.from?.id ?? 0,
    isStarterDeck: false,
    createdAt: now(),
  };
  ctx.session.decks!.push(deck);
  return deck;
}

export function deleteDeck(ctx: Ctx, deckId: string): boolean {
  ensureSession(ctx);
  const idx = ctx.session.decks!.findIndex((d) => d.id === deckId);
  if (idx < 0) return false;
  ctx.session.decks!.splice(idx, 1);
  ctx.session.cards = ctx.session.cards!.filter((c) => c.deckId !== deckId);
  return true;
}

export function getCardsForDeck(ctx: Ctx, deckId: string): CardData[] {
  ensureSession(ctx);
  return ctx.session.cards!.filter((c) => c.deckId === deckId);
}

export function getCard(ctx: Ctx, cardId: string): CardData | undefined {
  ensureSession(ctx);
  return ctx.session.cards!.find((c) => c.id === cardId);
}

export function addCard(
  ctx: Ctx,
  deckId: string,
  front: string,
  back: string,
  exampleSentence: string,
): CardData {
  ensureSession(ctx);
  const time = now();
  const scheduling = newCardScheduling(time);
  const card: CardData = {
    id: uid(),
    deckId,
    front,
    back,
    exampleSentence,
    ...scheduling,
    lastReviewed: 0,
    createdAt: time,
  };
  ctx.session.cards!.push(card);
  return card;
}

export function updateCard(ctx: Ctx, cardId: string, updates: Partial<CardData>): boolean {
  ensureSession(ctx);
  const card = ctx.session.cards!.find((c) => c.id === cardId);
  if (!card) return false;
  Object.assign(card, updates);
  return true;
}

export function deleteCard(ctx: Ctx, cardId: string): boolean {
  ensureSession(ctx);
  const idx = ctx.session.cards!.findIndex((c) => c.id === cardId);
  if (idx < 0) return false;
  ctx.session.cards!.splice(idx, 1);
  return true;
}

export function getDueCards(ctx: Ctx, deckId: string, now: number): CardData[] {
  const cards = getCardsForDeck(ctx, deckId);
  return cards.filter((c) => c.dueDate <= now);
}

export function getNewCardsToday(ctx: Ctx, currentTime: number): number {
  ensureSession(ctx);
  const startOfDay = new Date(currentTime);
  startOfDay.setHours(0, 0, 0, 0);
  const dayStart = startOfDay.getTime();
  return ctx.session.cards!.filter(
    (c) => c.state === "new" && c.createdAt >= dayStart,
  ).length;
}

export function getLearnedCardsCount(ctx: Ctx): number {
  ensureSession(ctx);
  return ctx.session.cards!.filter((c) => c.state === "review").length;
}

export function getTotalCardsCount(ctx: Ctx): number {
  ensureSession(ctx);
  return ctx.session.cards!.length;
}

export function addStarterDecks(ctx: Ctx): DeckData[] {
  ensureSession(ctx);
  const time = now();

  const vocabDeck = addDeck(ctx, "Common Words");
  vocabDeck.isStarterDeck = true;
  const starterCards: Array<{ front: string; back: string; example: string }> = [
    { front: "Hello", back: "A greeting", example: "Hello, how are you?" },
    { front: "Thank you", back: "Expression of gratitude", example: "Thank you for your help." },
    { front: "Please", back: "Polite request word", example: "Please sit down." },
    { front: "Goodbye", back: "A parting greeting", example: "Goodbye, see you tomorrow!" },
    { front: "Sorry", back: "Expression of apology", example: "Sorry, I didn't mean that." },
  ];
  for (const c of starterCards) {
    const card: CardData = {
      id: uid(),
      deckId: vocabDeck.id,
      front: c.front,
      back: c.back,
      exampleSentence: c.example,
      ...newCardScheduling(time),
      lastReviewed: 0,
      createdAt: time,
    };
    ctx.session.cards!.push(card);
  }

  const phrasesDeck = addDeck(ctx, "Useful Phrases");
  phrasesDeck.isStarterDeck = true;
  const phraseCards: Array<{ front: string; back: string; example: string }> = [
    { front: "How much is this?", back: "Asking about price", example: "How much is this shirt?" },
    { front: "Where is…?", back: "Asking for location", example: "Where is the nearest station?" },
    { front: "I don't understand", back: "Expressing confusion", example: "Sorry, I don't understand." },
    { front: "Can you help me?", back: "Requesting assistance", example: "Can you help me find this address?" },
    { front: "Nice to meet you", back: "Formal greeting", example: "Nice to meet you, I'm Alex." },
  ];
  for (const c of phraseCards) {
    const card: CardData = {
      id: uid(),
      deckId: phrasesDeck.id,
      front: c.front,
      back: c.back,
      exampleSentence: c.example,
      ...newCardScheduling(time),
      lastReviewed: 0,
      createdAt: time,
    };
    ctx.session.cards!.push(card);
  }

  return [vocabDeck, phrasesDeck];
}
