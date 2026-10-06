// Тексты бота на русском и узбекском (латиница)
import type { Lang } from "./school";

export const texts = {
  ru: {
    welcome: (name: string) =>
      `👋 Здравствуйте! Это бот записи на пробный урок в <b>${name}</b>.\n\nВыберите курс, день и время — администратор подтвердит запись.`,
    demoNote:
      "ℹ️ <i>Демо от CaravanHouse IT. Вы увидите обе стороны: сначала запишетесь как ученик, потом получите заявку так, как её видит администратор центра.</i>",
    start: "📚 Записаться на пробный урок",
    chooseCourse: "Какой курс интересует?",
    chooseDay: (course: string) => `<b>${course}</b>\n\nВыберите день пробного урока:`,
    chooseTime: (course: string, day: string) => `<b>${course}</b> · ${day}\n\nСвободное время:`,
    askName: "Как к вам обращаться? Напишите имя или нажмите кнопку.",
    useName: (name: string) => `Меня зовут ${name}`,
    askPhone: "Оставьте телефон — администратор позвонит, если что-то изменится.",
    sharePhone: "📱 Отправить номер",
    skipPhone: "Без телефона",
    summary: (s: Summary) =>
      `📝 <b>Проверьте заявку</b>\n\nКурс: <b>${s.course}</b>\nКогда: <b>${s.day}, ${s.time}</b>\nИмя: <b>${s.name}</b>\nТелефон: <b>${s.phone || "—"}</b>`,
    confirm: "✅ Подтвердить",
    edit: "✏️ Изменить",
    sent: "Заявка отправлена! Как только администратор подтвердит запись, придёт сообщение.",
    adminIntro: "👩‍💼 <b>Так заявку видит администратор центра</b> (в демо — вам же):",
    adminCard: (s: Summary & { id: number; status: Status }) =>
      `📥 <b>Заявка на пробный урок №${s.id}</b>\n\n📚 ${s.course}\n🗓 ${s.day}, ${s.time}\n👤 ${s.name}\n📞 ${s.phone || "—"}\n\nСтатус: <b>${statusRu[s.status]}</b>`,
    btnConfirm: "✅ Подтвердить",
    btnCall: "📞 Перезвоню",
    btnCancel: "❌ Отменить",
    toStudent: {
      confirmed: (s: Summary) => `🎉 Вы записаны на пробный урок!\n\n<b>${s.course}</b>, ${s.day}, ${s.time}.\nНапомним за 2 часа до начала.`,
      call: () => "📞 Администратор перезвонит вам в ближайшее время, чтобы уточнить детали.",
      cancelled: () => "Запись отменена. Выбрать другое время — /start",
    },
    notYours: "Это заявка другого человека",
    already: "Статус уже такой",
    pitch: "Хотите такого бота для своего учебного центра?",
    pitchBtn: "💬 Написать CaravanHouse IT",
    again: "🔁 Записаться ещё раз",
    unknown: "Чтобы записаться на пробный урок, нажмите /start",
    langBtn: "🇺🇿 Oʻzbekcha",
    stats: (starts: number, leads: number, top: string) => `📊 Открыли бота: ${starts}\nЗаявок: ${leads}\n\n${top || "Пока пусто"}`,
    weekdays: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
    months: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  },
  uz: {
    welcome: (name: string) =>
      `👋 Assalomu alaykum! Bu <b>${name}</b> sinov darsiga yozilish boti.\n\nKurs, kun va vaqtni tanlang — administrator yozilishni tasdiqlaydi.`,
    demoNote:
      "ℹ️ <i>CaravanHouse IT demosi. Ikkala tomonni ham koʻrasiz: avval oʻquvchi sifatida yozilasiz, keyin arizani markaz administratori koʻradigan koʻrinishda olasiz.</i>",
    start: "📚 Sinov darsiga yozilish",
    chooseCourse: "Qaysi kurs qiziqtiradi?",
    chooseDay: (course: string) => `<b>${course}</b>\n\nSinov darsi kunini tanlang:`,
    chooseTime: (course: string, day: string) => `<b>${course}</b> · ${day}\n\nBoʻsh vaqt:`,
    askName: "Sizga qanday murojaat qilaylik? Ismingizni yozing yoki tugmani bosing.",
    useName: (name: string) => `Ismim ${name}`,
    askPhone: "Telefon raqamingizni qoldiring — biror narsa oʻzgarsa, administrator qoʻngʻiroq qiladi.",
    sharePhone: "📱 Raqamni yuborish",
    skipPhone: "Telefonsiz",
    summary: (s: Summary) =>
      `📝 <b>Arizani tekshiring</b>\n\nKurs: <b>${s.course}</b>\nQachon: <b>${s.day}, ${s.time}</b>\nIsm: <b>${s.name}</b>\nTelefon: <b>${s.phone || "—"}</b>`,
    confirm: "✅ Tasdiqlash",
    edit: "✏️ Oʻzgartirish",
    sent: "Ariza yuborildi! Administrator yozilishni tasdiqlashi bilan xabar keladi.",
    adminIntro: "👩‍💼 <b>Markaz administratori arizani shunday koʻradi</b> (demoda — sizga):",
    adminCard: (s: Summary & { id: number; status: Status }) =>
      `📥 <b>Sinov darsiga ariza №${s.id}</b>\n\n📚 ${s.course}\n🗓 ${s.day}, ${s.time}\n👤 ${s.name}\n📞 ${s.phone || "—"}\n\nHolat: <b>${statusUz[s.status]}</b>`,
    btnConfirm: "✅ Tasdiqlash",
    btnCall: "📞 Qoʻngʻiroq qilaman",
    btnCancel: "❌ Bekor qilish",
    toStudent: {
      confirmed: (s: Summary) => `🎉 Siz sinov darsiga yozildingiz!\n\n<b>${s.course}</b>, ${s.day}, ${s.time}.\nBoshlanishidan 2 soat oldin eslatamiz.`,
      call: () => "📞 Administrator tafsilotlarni aniqlash uchun tez orada qoʻngʻiroq qiladi.",
      cancelled: () => "Yozilish bekor qilindi. Boshqa vaqtni tanlash — /start",
    },
    notYours: "Bu boshqa odamning arizasi",
    already: "Holat allaqachon shunday",
    pitch: "Oʻquv markazingiz uchun shunday bot kerakmi?",
    pitchBtn: "💬 CaravanHouse IT ga yozish",
    again: "🔁 Yana yozilish",
    unknown: "Sinov darsiga yozilish uchun /start ni bosing",
    langBtn: "🇷🇺 Русский",
    stats: (starts: number, leads: number, top: string) => `📊 Botni ochganlar: ${starts}\nArizalar: ${leads}\n\n${top || "Hozircha boʻsh"}`,
    weekdays: ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"],
    months: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"],
  },
} satisfies Record<Lang, unknown>;

export type Status = "new" | "confirmed" | "call" | "cancelled";
const statusRu: Record<Status, string> = { new: "🆕 новая", confirmed: "✅ подтверждена", call: "📞 нужно перезвонить", cancelled: "❌ отменена" };
const statusUz: Record<Status, string> = { new: "🆕 yangi", confirmed: "✅ tasdiqlandi", call: "📞 qoʻngʻiroq qilish kerak", cancelled: "❌ bekor qilindi" };

export interface Summary {
  course: string;
  day: string;
  time: string;
  name: string;
  phone?: string;
}

export const t = (lang: Lang) => texts[lang];
