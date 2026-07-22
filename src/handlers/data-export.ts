import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getDecks, getCardsForDeck, addCard, getDeck } from "../data.js";

registerMainMenuItem({ label: "📤 Export", data: "data:export", order: 70 });

const composer = new Composer<Ctx>();

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function cardsToCsv(cards: ReturnType<typeof getCardsForDeck>, deckName: string): string {
  const header = "deck,front,back,example_sentence";
  const rows = cards.map(
    (c) =>
      [
        escapeCsvField(deckName),
        escapeCsvField(c.front),
        escapeCsvField(c.back),
        escapeCsvField(c.exampleSentence),
      ].join(","),
  );
  return [header, ...rows].join("\n");
}

composer.callbackQuery("data:export", async (ctx) => {
  await ctx.answerCallbackQuery();
  const decks = getDecks(ctx);
  if (decks.length === 0) {
    await ctx.editMessageText("No decks to export yet. Create a deck and add some cards first.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  let allCsv = "deck,front,back,example_sentence";
  let totalCards = 0;
  for (const deck of decks) {
    const cards = getCardsForDeck(ctx, deck.id);
    if (cards.length === 0) continue;
    totalCards += cards.length;
    const csv = cardsToCsv(cards, deck.name);
    const lines = csv.split("\n");
    allCsv += "\n" + lines.slice(1).join("\n");
  }

  if (totalCards === 0) {
    await ctx.editMessageText("No cards to export yet. Add some cards to your decks first.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  await ctx.reply(
    `📤 Exported ${totalCards} cards from ${decks.length} deck(s).\n\nCopy the CSV below:`,
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    },
  );
  await ctx.reply(`<code>${allCsv}</code>`, { parse_mode: "HTML" });
});

composer.callbackQuery("data:import", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_csv_import";
  await ctx.reply(
    "Paste your CSV below. Format: deck,front,back,example_sentence\nOne card per line.",
    {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: "Paste CSV data…",
      },
    },
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_csv_import") return next();
  const text = ctx.message.text.trim();
  ctx.session.step = undefined;

  const lines = text.split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) {
    await ctx.reply("No valid cards found. Make sure each line has: deck,front,back,example_sentence", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  let imported = 0;
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = parseCsvLine(line);
    if (parts.length < 3) {
      skipped++;
      continue;
    }
    const [deckName, front, back, example] = parts;
    if (!deckName || !front || !back) {
      skipped++;
      continue;
    }

    let deck = getDecks(ctx).find((d) => d.name === deckName);
    if (!deck) {
      const { addDeck } = await import("../data.js");
      deck = addDeck(ctx, deckName);
    }
    addCard(ctx, deck.id, front, back, example || "");
    imported++;
  }

  await ctx.reply(`✅ Imported ${imported} card(s).${skipped > 0 ? ` Skipped ${skipped} invalid line(s).` : ""}`, {
    reply_markup: inlineKeyboard([
      [inlineButton("📚 Browse decks", "deck:browse")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

export default composer;
