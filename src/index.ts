import "dotenv/config";
import { join } from "node:path";
import { createBot, type SessionData } from "./bot";
import { httpsUrl } from "./env";
import { openStore, SessionStore } from "./store";

// Токен только из переменных окружения (на Railway — Variables), в код и репозиторий не попадает
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("Укажите BOT_TOKEN в переменных окружения");
  process.exit(1);
}
// На Railway подключите Volume и укажите его путь (например /data), иначе заявки сотрутся при деплое
const dataDir = process.env.DATA_DIR || join(process.cwd(), "data");

const store = openStore(join(dataDir, "trial.json"));
const sessions = new SessionStore<SessionData>(join(dataDir, "sessions.json"));
const bot = createBot(token, store, {
  // по умолчанию демо: ученик сам видит карточку администратора. DEMO_MODE=0 — заявки в ADMIN_CHAT_ID
  demoMode: process.env.DEMO_MODE !== "0",
  adminChatId: process.env.ADMIN_CHAT_ID || undefined,
  schoolsApi: httpsUrl("SCHOOLS_API", process.env.SCHOOLS_API) ?? "https://edu.caravanhouse.uz",
  leadBotUrl: httpsUrl("LEAD_BOT_URL", process.env.LEAD_BOT_URL)?.replace(/\/$/, "") ?? "https://t.me/CaravanHousebot",
  sessions,
});
bot.catch((e) => console.error("Ошибка бота:", e.message));
void bot.api
  .setMyCommands([{ command: "start", description: "Записаться на пробный урок" }])
  .catch(() => {});
void bot.api.setMyCommands([{ command: "start", description: "Sinov darsiga yozilish" }], { language_code: "uz" }).catch(() => {});
void bot.start({ onStart: (me) => console.log(`Бот @${me.username} запущен`) });
// Railway останавливает сервис через SIGTERM: успеваем записать данные на диск
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => {
    store.flush();
    sessions.flush();
    process.exit(0);
  });
