import { Bot, Context, InlineKeyboard, Keyboard, session, type SessionFlavor, type StorageAdapter } from "grammy";
import { DEFAULT_SCHOOL, isSlug, loadSchool, type Lang, type School } from "./school";
import { dayLabel, freeTimes, nextDays } from "./slots";
import type { Store, TrialLead } from "./store";
import { t, type Status, type Summary } from "./texts";

type Step = "idle" | "name" | "phone" | "confirm";

export interface SessionData {
  school: School;
  lang: Lang;
  step: Step;
  course?: number;
  day?: string;
  time?: string;
  name?: string;
  phone?: string;
}
export type MyContext = Context & SessionFlavor<SessionData>;

export interface BotOptions {
  /** true — карточку администратора получает сам ученик (демо, как в магазине цветов) */
  demoMode: boolean;
  /** Чат администратора: получает заявки, когда demoMode выключен, и может смотреть /stats */
  adminChatId?: string;
  /** Сайт с конфигами персональных демо (/api/p/<slug>) */
  schoolsApi: string;
  /** Бот заявок CaravanHouse IT — кнопка «Хочу такого бота» */
  leadBotUrl: string;
  sessions?: StorageAdapter<SessionData>;
  fetchImpl?: typeof fetch;
  botInfo?: ConstructorParameters<typeof Bot>[1] extends infer O ? (O extends { botInfo?: infer B } ? B : never) : never;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fresh = (): SessionData => ({ school: DEFAULT_SCHOOL, lang: DEFAULT_SCHOOL.lang, step: "idle" });
const html = { parse_mode: "HTML" as const };

export function createBot(token: string, store: Store, opts: BotOptions) {
  const bot = new Bot<MyContext>(token, opts.botInfo ? { botInfo: opts.botInfo } : undefined);
  const isAdmin = (chatId?: number) => !!opts.adminChatId && String(chatId) === String(opts.adminChatId);
  bot.use(session({ initial: fresh, storage: opts.sessions }));

  const summary = (s: SessionData): Summary => ({
    course: s.school.courses[s.course ?? 0],
    day: s.day ? dayLabel(s.day, s.lang) : "",
    time: s.time ?? "",
    name: s.name ?? "",
    phone: s.phone,
  });
  const leadSummary = (l: TrialLead, lang: Lang): Summary => ({ course: l.course, day: dayLabel(l.day, lang), time: l.time, name: l.name, phone: l.phone });
  const pitchKb = (s: SessionData) =>
    new InlineKeyboard().url(t(s.lang).pitchBtn, `${opts.leadBotUrl}?start=demobot_${s.school.slug ?? "edu"}`).row().text(t(s.lang).again, "go");

  const welcome = async (ctx: MyContext) => {
    const s = ctx.session;
    const tx = t(s.lang);
    await ctx.reply(`${tx.welcome(esc(s.school.name))}\n\n${tx.demoNote}`, {
      ...html,
      reply_markup: new InlineKeyboard().text(tx.start, "go").row().text(tx.langBtn, "lang"),
    });
  };

  const courseList = (s: SessionData) => {
    const kb = new InlineKeyboard();
    s.school.courses.forEach((c, i) => kb.text(c, `c:${i}`).row());
    return kb;
  };

  // /start <slug> — персональное демо центра; без метки — Zukko Academy
  bot.command("start", async (ctx) => {
    const payload = ctx.match.trim().toLowerCase();
    const school = payload && isSlug(payload) ? ((await loadSchool(payload, opts.schoolsApi, opts.fetchImpl)) ?? DEFAULT_SCHOOL) : DEFAULT_SCHOOL;
    ctx.session = { ...fresh(), school, lang: school.lang };
    const key = school.slug ?? "";
    store.data.starts[key] = (store.data.starts[key] ?? 0) + 1;
    store.save();
    await welcome(ctx);
  });

  bot.callbackQuery("lang", async (ctx) => {
    ctx.session.lang = ctx.session.lang === "ru" ? "uz" : "ru";
    await ctx.answerCallbackQuery();
    await welcome(ctx);
  });

  bot.callbackQuery("go", async (ctx) => {
    ctx.session = { ...ctx.session, step: "idle", course: undefined, day: undefined, time: undefined };
    await ctx.answerCallbackQuery();
    await ctx.reply(t(ctx.session.lang).chooseCourse, { reply_markup: courseList(ctx.session) });
  });

  bot.callbackQuery(/^c:(\d+)$/, async (ctx) => {
    const i = Number(ctx.match[1]);
    const s = ctx.session;
    await ctx.answerCallbackQuery();
    if (!s.school.courses[i]) return;
    s.course = i;
    const kb = new InlineKeyboard();
    nextDays().forEach((d, n) => {
      kb.text(dayLabel(d.key, s.lang), `d:${d.key}`);
      if (n % 2) kb.row();
    });
    await ctx.editMessageText(t(s.lang).chooseDay(esc(s.school.courses[i])), { ...html, reply_markup: kb });
  });

  bot.callbackQuery(/^d:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    const s = ctx.session;
    await ctx.answerCallbackQuery();
    if (s.course === undefined) return;
    s.day = ctx.match[1];
    const course = s.school.courses[s.course];
    const kb = new InlineKeyboard();
    freeTimes(course, s.day).forEach((time, n) => {
      kb.text(time, `t:${time}`);
      if (n % 3 === 2) kb.row();
    });
    await ctx.editMessageText(t(s.lang).chooseTime(esc(course), dayLabel(s.day, s.lang)), { ...html, reply_markup: kb });
  });

  bot.callbackQuery(/^t:(\d{2}:\d{2})$/, async (ctx) => {
    const s = ctx.session;
    await ctx.answerCallbackQuery();
    if (s.course === undefined || !s.day) return;
    s.time = ctx.match[1];
    s.step = "name";
    const tx = t(s.lang);
    await ctx.editMessageText(`${tx.chooseTime(esc(s.school.courses[s.course]), dayLabel(s.day, s.lang))} <b>${s.time}</b> ✅`, html);
    const first = ctx.from.first_name;
    await ctx.reply(tx.askName, { reply_markup: new Keyboard().text(tx.useName(first)).resized().oneTime() });
  });

  const askPhone = (ctx: MyContext) => {
    const tx = t(ctx.session.lang);
    ctx.session.step = "phone";
    return ctx.reply(tx.askPhone, { reply_markup: new Keyboard().requestContact(tx.sharePhone).row().text(tx.skipPhone).resized().oneTime() });
  };

  const showSummary = async (ctx: MyContext) => {
    const s = ctx.session;
    const tx = t(s.lang);
    s.step = "confirm";
    await ctx.reply("👌", { reply_markup: { remove_keyboard: true } });
    await ctx.reply(tx.summary({ ...summary(s), name: esc(s.name ?? ""), course: esc(summary(s).course) }), {
      ...html,
      reply_markup: new InlineKeyboard().text(tx.confirm, "ok").text(tx.edit, "go"),
    });
  };

  bot.on("message:contact", async (ctx) => {
    if (ctx.session.step !== "phone") return;
    const p = ctx.message.contact.phone_number;
    ctx.session.phone = p.startsWith("+") ? p : `+${p}`;
    await showSummary(ctx);
  });

  const adminKb = (id: number, lang: Lang) => {
    const tx = t(lang);
    return new InlineKeyboard().text(tx.btnConfirm, `s:${id}:confirmed`).text(tx.btnCall, `s:${id}:call`).row().text(tx.btnCancel, `s:${id}:cancelled`);
  };

  bot.callbackQuery("ok", async (ctx) => {
    const s = ctx.session;
    await ctx.answerCallbackQuery();
    if (s.step !== "confirm" || s.course === undefined || !s.day || !s.time) return;
    const tx = t(s.lang);
    const lead: TrialLead = {
      id: store.data.nextId++,
      at: Date.now(),
      slug: s.school.slug,
      userId: ctx.from.id,
      chatId: ctx.chat?.id ?? ctx.from.id,
      course: s.school.courses[s.course],
      day: s.day,
      time: s.time,
      name: s.name ?? ctx.from.first_name,
      phone: s.phone,
      status: "new",
    };
    store.data.leads.push(lead);
    store.save();
    s.step = "idle";
    await ctx.editMessageReplyMarkup().catch(() => {});
    await ctx.reply(tx.sent);

    const card = tx.adminCard({ ...leadSummary(lead, s.lang), name: esc(lead.name), course: esc(lead.course), id: lead.id, status: lead.status });
    if (opts.demoMode || !opts.adminChatId) {
      // демо: обе роли у одного человека
      await ctx.reply(`${tx.adminIntro}\n\n${card}`, { ...html, reply_markup: adminKb(lead.id, s.lang) });
    } else {
      await ctx.api.sendMessage(opts.adminChatId, card, { ...html, reply_markup: adminKb(lead.id, s.lang) }).catch((e) => console.error("Админу не доставлено:", e.message));
    }
  });

  // Кнопки статуса на карточке администратора
  bot.callbackQuery(/^s:(\d+):(confirmed|call|cancelled)$/, async (ctx) => {
    const lead = store.data.leads.find((l) => l.id === Number(ctx.match[1]));
    const status = ctx.match[2] as Status;
    const lang = ctx.session.lang;
    const tx = t(lang);
    if (!lead) return ctx.answerCallbackQuery();
    const allowed = isAdmin(ctx.chat?.id) || (opts.demoMode && lead.userId === ctx.from.id);
    if (!allowed) return ctx.answerCallbackQuery({ text: tx.notYours, show_alert: true });
    if (lead.status === status) return ctx.answerCallbackQuery({ text: tx.already });
    lead.status = status;
    store.save();
    await ctx.answerCallbackQuery({ text: "✓" });
    const card = tx.adminCard({ ...leadSummary(lead, lang), name: esc(lead.name), course: esc(lead.course), id: lead.id, status });
    const intro = opts.demoMode && !isAdmin(ctx.chat?.id) ? `${tx.adminIntro}\n\n` : "";
    await ctx.editMessageText(intro + card, { ...html, reply_markup: status === "cancelled" ? undefined : adminKb(lead.id, lang) }).catch(() => {});
    // сообщение ученику — так оно выглядит с его стороны
    const s = leadSummary(lead, lang);
    const text = status === "confirmed" ? tx.toStudent.confirmed({ ...s, course: esc(s.course) }) : status === "call" ? tx.toStudent.call() : tx.toStudent.cancelled();
    await ctx.api.sendMessage(lead.chatId, text, html).catch(() => {});
    // в демо после подтверждения предлагаем такой же бот — со ссылкой в бот заявок с меткой demobot_<slug>
    if (opts.demoMode && status === "confirmed") await ctx.api.sendMessage(lead.chatId, tx.pitch, { reply_markup: pitchKb(ctx.session) }).catch(() => {});
  });

  bot.command("stats", async (ctx) => {
    if (!isAdmin(ctx.chat.id)) return;
    const starts = Object.values(store.data.starts).reduce((a, b) => a + b, 0);
    const bySlug = Object.entries(store.data.starts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([slug, n]) => `${slug || "без метки"} — ${n} / ${store.data.leads.filter((l) => (l.slug ?? "") === slug).length}`)
      .join("\n");
    await ctx.reply(t("ru").stats(starts, store.data.leads.length, bySlug));
  });

  bot.command("id", (ctx) => ctx.reply(`chat id: ${ctx.chat.id}`));

  // Имя и телефон — обычным текстом
  bot.on("message:text", async (ctx) => {
    const s = ctx.session;
    const tx = t(s.lang);
    const text = ctx.message.text.trim();
    if (s.step === "name") {
      const name = text.startsWith(tx.useName("").trim()) ? ctx.from.first_name : text;
      s.name = name.slice(0, 60);
      return askPhone(ctx);
    }
    if (s.step === "phone") {
      if (text !== tx.skipPhone) s.phone = text.slice(0, 30);
      return showSummary(ctx);
    }
    await ctx.reply(tx.unknown);
  });

  return bot;
}
