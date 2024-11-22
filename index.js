import TelegramBot from "node-telegram-bot-api";
import { promises as fs } from "fs";
import path from "path";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

let token = process.env.AZKAR_TOKEN;

// Create a new Telegram bot instance
const bot = new TelegramBot(token, { polling: true });

const jsonFilePath = path.join(process.cwd(), "azkar.json");

let chatId = null;
let task = null;

async function loadRandomZikr() {
  try {
    const data = await fs.readFile(jsonFilePath, "utf8");
    const azkar = JSON.parse(data);

    // Get a random Zikr
    const randomIndex = Math.floor(Math.random() * azkar.length);
    const randomZikr = azkar[randomIndex];

    return `${randomZikr.arabic}\n${randomZikr.transliteration}`;
  } catch (error) {
    console.error("Error reading the JSON file:", error);
    return null;
  }
}

// Handle the /start command to show the Start/Stop options directly
bot.onText(/\/start/, (msg) => {
  chatId = msg.chat.id;
  bot.sendMessage(chatId, "Choose an option:", {
    reply_markup: {
      keyboard: [[{ text: "/start" }, { text: "/stop" }]],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  });
});

// Handle the actual /start command to start the cron job
bot.onText(/\/start/, (msg) => {
  if (msg.text !== "/start") return;

  chatId = msg.chat.id;
  bot.sendMessage(chatId, "You will receive a Zikr every minute.");

  // Schedule the cron job to run the function every minute
  task = cron.schedule("*/15 * * * *", async () => {
    if (chatId) {
      const randomZikr = await loadRandomZikr();
      if (randomZikr) {
        bot.sendMessage(chatId, randomZikr);
      }
    }
  });
  console.log("Cron job started.");
});

// Handle the /stop command to stop the cron job
bot.onText(/\/stop/, (msg) => {
  if (task) {
    task.stop();
    bot.sendMessage(msg.chat.id, "You have stopped receiving Azkar.");
    chatId = null;
    console.log("Cron job stopped.");
  } else {
    bot.sendMessage(msg.chat.id, "No active Zikr service to stop.");
  }
});

console.log("Telegram bot is running...");
