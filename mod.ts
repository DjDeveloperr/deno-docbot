import { DocBot } from "./bot/mod.ts";

if (import.meta.main) {
  const bot = new DocBot();
  bot.connect();
}
