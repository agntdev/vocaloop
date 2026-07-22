import { readFileSync } from "node:fs";
import { buildBot } from "./bot.js";
import { setDefaultCommands } from "./toolkit/index.js";

function resolveBotToken(): string {
  const direct = process.env.BOT_TOKEN?.trim();
  if (direct) return direct;
  const file = process.env.BOT_TOKEN_FILE;
  if (file) return readFileSync(file, "utf8").trim();
  console.error("BOT_TOKEN or BOT_TOKEN_FILE must be set");
  process.exit(1);
}

async function main() {
  const bot = await buildBot(resolveBotToken());
  await setDefaultCommands(bot);
  bot.start();
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
