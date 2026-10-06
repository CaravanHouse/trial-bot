// Какой центр показывает бот. Ссылка t.me/<бот>?start=<slug> открывает персональное демо:
// название и курсы берём из того же конфига, что и сайт edu.caravanhouse.uz/<язык>/p/<slug>.
// Сами конфиги хранятся приватно (репозиторий CaravanHouse/sales + Vercel Blob), бот читает их через /api/p/<slug>.

export type Lang = "ru" | "uz";

export interface School {
  slug: string | null;
  name: string;
  lang: Lang;
  courses: string[];
  district?: string;
}

/** Без метки — вымышленный центр из демо-сайта */
export const DEFAULT_SCHOOL: School = {
  slug: null,
  name: "Zukko Academy",
  lang: "ru",
  courses: ["General English", "IELTS Intensive", "Speaking Club", "English for Kids", "Python-разработчик", "UI/UX-дизайн", "Математика 5–9 класс", "SAT Math"],
};

const SLUG = /^[a-z0-9-]{1,40}$/;
export const isSlug = (value: string) => SLUG.test(value);

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; school: School | null }>();

/** Конфиг центра по slug; null — такого нет или сайт недоступен (тогда бот покажет обычное демо) */
export async function loadSchool(slug: string, api: string, fetchImpl: typeof fetch = fetch): Promise<School | null> {
  if (!isSlug(slug)) return null;
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.school;
  let school: School | null = null;
  try {
    const res = await fetchImpl(`${api.replace(/\/$/, "")}/api/p/${slug}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = (await res.json()) as Partial<School> & { courses?: unknown };
      const courses = Array.isArray(data.courses) ? data.courses.filter((c): c is string => typeof c === "string" && c.trim() !== "").slice(0, 12) : [];
      if (typeof data.name === "string" && courses.length) {
        school = { slug, name: data.name, lang: data.lang === "uz" ? "uz" : "ru", courses, district: typeof data.district === "string" ? data.district : undefined };
      }
    } else if (res.status !== 404) {
      console.warn(`Конфиг ${slug}: сайт ответил ${res.status}`);
    }
  } catch (e) {
    console.warn(`Конфиг ${slug} не загрузился:`, (e as Error).message);
    return null; // сеть — не кешируем, попробуем в следующий раз
  }
  cache.set(slug, { at: Date.now(), school });
  return school;
}
