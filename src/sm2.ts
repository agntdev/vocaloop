export interface CardScheduling {
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  dueDate: number;
  state: "new" | "learning" | "review" | "relearning";
}

const MIN_EASE_FACTOR = 1.3;

export function sm2(
  quality: number,
  current: CardScheduling,
  now: number,
): CardScheduling {
  let { easeFactor, intervalDays, repetitionCount, state } = current;

  if (quality < 0 || quality > 3) {
    throw new Error("quality must be 0..3");
  }

  if (quality === 0) {
    repetitionCount = 0;
    intervalDays = 1;
    state = "relearning";
  } else if (quality === 1) {
    if (repetitionCount === 0) {
      intervalDays = 1;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
    }
    repetitionCount += 1;
    state = "learning";
  } else {
    if (repetitionCount === 0) {
      intervalDays = 1;
    } else if (repetitionCount === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitionCount += 1;
    state = "review";
  }

  easeFactor = easeFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
  if (easeFactor < MIN_EASE_FACTOR) easeFactor = MIN_EASE_FACTOR;

  const dueDate = now + intervalDays * 24 * 60 * 60 * 1000;

  return { easeFactor, intervalDays, repetitionCount, dueDate, state };
}

export function qualityFromButton(rating: "again" | "hard" | "good" | "easy"): number {
  switch (rating) {
    case "again": return 0;
    case "hard": return 1;
    case "good": return 2;
    case "easy": return 3;
  }
}

export function newCardScheduling(now: number): CardScheduling {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitionCount: 0,
    dueDate: now,
    state: "new",
  };
}
