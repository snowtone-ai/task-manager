import Dexie, { type Table } from "dexie";

export type Category = "job" | "university" | "life";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string | null; // HH:MM or null (all-day)
  category: Category;
  completed: boolean;
  completedAt: string | null; // ISO datetime
  recurrence: Recurrence;
  recurrenceDayOfWeek?: number; // 0=Sun ~ 6=Sat (weekly only)
  recurrenceDayOfMonth?: number; // 1-31 (monthly only)
  createdAt: string; // ISO datetime
}

export interface Streak {
  date: string; // YYYY-MM-DD (primary key)
  allCompleted: boolean;
}

class TaskManagerDB extends Dexie {
  tasks!: Table<Task, string>;
  streaks!: Table<Streak, string>;

  constructor() {
    super("TaskManagerDB");
    this.version(1).stores({
      tasks: "id, dueDate, category, completed, recurrence",
      streaks: "date",
    });
  }
}

// Lazy singleton — instantiating Dexie at module load triggers side effects
// that only make sense in the browser. Keeping this lazy lets server-side
// rendering safely import anything from `lib/db` without touching IndexedDB.
let _db: TaskManagerDB | null = null;

export function getDb(): TaskManagerDB {
  if (typeof window === "undefined") {
    throw new Error("getDb() called in a non-browser environment");
  }
  if (!_db) _db = new TaskManagerDB();
  return _db;
}

// Back-compat proxy so existing `db.tasks...` call sites keep working.
// Access on the server will throw via getDb() — intended.
export const db = new Proxy({} as TaskManagerDB, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    return real[prop as string];
  },
});
