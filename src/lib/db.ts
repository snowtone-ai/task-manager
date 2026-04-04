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

export const db = new TaskManagerDB();
