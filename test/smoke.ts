// Проверка диалога целиком: Telegram и сайт с конфигами подменены заглушками
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBot } from "../src/bot";
import { loadSchool } from "../src/school";
import { freeTimes, nextDays } from "../src/slots";
import { openStore } from "../src/store";

// 1. расписание: 6 дней без воскресенья, у каждого дня есть свободное время
const days = nextDays(new Date(2026, 9, 3)); // суббота
assert.equal(days.length, 6);
assert.ok(days.every((d) => d.date.getDay() !== 0), "без воскресений");
assert.ok(days.every((d) => freeTimes("IELTS", d.key).length > 0));

// 2. конфиг центра с сайта
const config = { slug: "primer", name: "Учебный центр «Пример»", lang: "ru", courses: ["General English", "Математика"] };
const fakeFetch = (async (url: string) =>
  String(url).endsWith("/api/p/primer") ? new Response(JSON.stringify(config)) : new Response("{}", { status: 404 })) as typeof fetch;
assert.equal((await loadSchool("primer", "https://x", fakeFetch))?.name, config.name);
assert.equal(await loadSchool("../etc", "https://x", fakeFetch), null, "кривой slug не уходит в запрос");
assert.equal(await loadSchool("nope", "https://x", fakeFetch), null);

// 3. диалог
const calls: { method: string; payload: any }[] = [];
const store = openStore(join(mkdtempSync(join(tmpdir(), "trial-")), "t.json"));
const bot = createBot("123:TEST", store, {
  demoMode: true,
  schoolsApi: "https://x",
  leadBotUrl: "https://t.me/CaravanHousebot",
  fetchImpl: fakeFetch,
  botInfo: { id: 123, is_bot: true, first_name: "t", username: "t_bot", can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false, can_connect_to_business: false, has_main_web_app: false } as any,
});
bot.api.config.use(async (_p, method, payload) => {
  calls.push({ method, payload });
  return { ok: true, result: { message_id: 1, date: 0, chat: { id: 42, type: "private" } } } as any;
});

let uid = 1;
const from = { id: 42, is_bot: false, first_name: "Азиз" };
const chat = { id: 42, type: "private" as const };
const msg = (text: string, extra: object = {}) =>
  bot.handleUpdate({ update_id: uid++, message: { message_id: uid, date: 0, chat, from, text, ...(text.startsWith("/") ? { entities: [{ type: "bot_command", offset: 0, length: text.split(" ")[0].length }] } : {}), ...extra } } as any);
const press = (data: string) => bot.handleUpdate({ update_id: uid++, callback_query: { id: String(uid), chat_instance: "x", from, data, message: { message_id: 1, date: 0, chat, text: "x" } } } as any);
const last = (method = "sendMessage") => [...calls].reverse().find((c) => c.method === method)!;
const buttons = (c: { payload: any }) => (c.payload.reply_markup?.inline_keyboard ?? []).flat();

await msg("/start primer");
assert.match(last().payload.text, /Учебный центр «Пример»/, "приветствие с названием центра");
assert.match(last().payload.text, /CaravanHouse IT/);
await press("go");
assert.deepEqual(buttons(last()).map((b: any) => b.text), ["General English", "Математика"], "курсы центра");
await press("c:1");
const dayBtn = buttons(last("editMessageText"))[0];
await press(dayBtn.callback_data);
const timeBtn = buttons(last("editMessageText"))[0];
await press(timeBtn.callback_data);
await msg("Меня зовут Азиз");
await msg("", { text: undefined, contact: { phone_number: "998901234567", first_name: "Азиз" } });
assert.match(last().payload.text, /Математика/);
assert.match(last().payload.text, /\+998901234567/);
await press("ok");
const card = last();
assert.match(card.payload.text, /Так заявку видит администратор/, "в демо карточка админа приходит самому ученику");
assert.equal(store.data.leads.length, 1);
assert.equal(store.data.leads[0].slug, "primer");

await press("s:1:confirmed");
assert.equal(store.data.leads[0].status, "confirmed");
assert.ok(calls.some((c) => c.method === "sendMessage" && /Вы записаны/.test(c.payload.text)), "ученик получил подтверждение");
const pitch = last();
assert.ok(buttons(pitch).some((b: any) => b.url === "https://t.me/CaravanHousebot?start=demobot_primer"), "ссылка в бот заявок с меткой");

// чужую заявку менять нельзя
const other = { ...from, id: 77 };
await bot.handleUpdate({ update_id: uid++, callback_query: { id: "z", chat_instance: "x", from: other, data: "s:1:cancelled", message: { message_id: 1, date: 0, chat: { id: 77, type: "private" }, text: "x" } } } as any);
assert.equal(store.data.leads[0].status, "confirmed");

// 4. без метки и с неизвестной меткой — обычное демо
await msg("/start");
assert.match(last().payload.text, /Zukko Academy/);
await msg("/start nope");
assert.match(last().payload.text, /Zukko Academy/);
assert.equal(store.data.starts.primer, 1);
assert.equal(store.data.starts[""], 2);

console.log("✓ trial-bot: все проверки пройдены");
process.exit(0);
