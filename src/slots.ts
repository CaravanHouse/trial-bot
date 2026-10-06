// Свободные окна для пробного урока. В демо считаются из курса и даты (одинаковы при каждом запуске);
// в настоящем боте сюда подключается расписание центра (Google Таблица, CRM или админка).
import { t } from "./texts";
import type { Lang } from "./school";

const TIMES = ["10:00", "11:30", "14:00", "16:00", "18:00", "19:30"];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Ближайшие 6 рабочих дней (без воскресенья), начиная с завтра */
export function nextDays(now = new Date()) {
  const days: Date[] = [];
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  while (days.length < 6) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) days.push(new Date(d));
  }
  return days.map((date) => ({ key: ymd(date), date }));
}

export const dayLabel = (key: string, lang: Lang) => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  const tx = t(lang);
  return `${tx.weekdays[date.getDay()]}, ${d} ${tx.months[m - 1]}`;
};

/** Свободные времена: примерно треть окон «занята» */
export const freeTimes = (course: string, dayKey: string) => TIMES.filter((time) => hash(`${course}|${dayKey}|${time}`) > 0.33);
