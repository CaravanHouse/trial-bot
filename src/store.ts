import type { StorageAdapter } from "grammy";
import { JsonDb } from "./db";
import type { Status } from "./texts";

export interface TrialLead {
  id: number;
  at: number;
  slug: string | null;
  userId: number;
  chatId: number;
  course: string;
  day: string;
  time: string;
  name: string;
  phone?: string;
  status: Status;
}

interface DbShape {
  nextId: number;
  /** сколько раз открывали бота по каждой метке ("" — без метки) */
  starts: Record<string, number>;
  leads: TrialLead[];
}

export const openStore = (file: string) => new JsonDb<DbShape>(file, { nextId: 1, starts: {}, leads: [] });
export type Store = ReturnType<typeof openStore>;

/** Сессии диалога в файле: после перезапуска запись продолжается с того же шага */
export class SessionStore<T> extends JsonDb<Record<string, T>> implements StorageAdapter<T> {
  constructor(file: string) {
    super(file, {});
  }
  read(key: string) {
    return this.data[key];
  }
  write(key: string, value: T) {
    this.data[key] = value;
    this.save();
  }
  delete(key: string) {
    delete this.data[key];
    this.save();
  }
}
