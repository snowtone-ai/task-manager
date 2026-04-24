"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, Calendar, List, Plus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { type Task, type Category } from "@/lib/db";
import { getAllTasks } from "@/lib/taskDb";
import { TaskEditModal } from "@/components/home/task-edit-modal";
import { TaskAddModal } from "@/components/home/task-add-modal";

// ── helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

const categoryConfig = {
  job:        { label: "就活", bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"   },
  university: { label: "大学", bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  life:       { label: "生活", bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
} as const;

const CATEGORY_FILTERS: { value: Category | "all"; label: string }[] = [
  { value: "all",        label: "すべて" },
  { value: "job",        label: "就活"   },
  { value: "university", label: "大学"   },
  { value: "life",       label: "生活"   },
];

const weekdayLabel = ["日", "月", "火", "水", "木", "金", "土"];

function doesTaskApplyToDate(task: Task, dateStr: string): boolean {
  const dateObj = new Date(dateStr + "T00:00:00");
  const dayOfWeek = dateObj.getDay();
  const dayOfMonth = dateObj.getDate();

  if (task.recurrence === "none")    return task.dueDate === dateStr;
  if (task.recurrence === "daily")   return task.dueDate <= dateStr;
  if (task.recurrence === "weekly")  return task.dueDate <= dateStr && task.recurrenceDayOfWeek === dayOfWeek;
  if (task.recurrence === "monthly") return task.dueDate <= dateStr && task.recurrenceDayOfMonth === dayOfMonth;
  return false;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayDateString(): string {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
}

function getRecurrenceDetail(task: Task): string {
  if (task.recurrence === "none") return "";
  if (task.recurrence === "daily") return "毎日";
  if (task.recurrence === "weekly" && task.recurrenceDayOfWeek !== undefined) {
    return `毎週${weekdayLabel[task.recurrenceDayOfWeek]}曜`;
  }
  if (task.recurrence === "monthly" && task.recurrenceDayOfMonth !== undefined) {
    return `毎月${task.recurrenceDayOfMonth}日`;
  }
  return "";
}

function sortByTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.dueTime && !b.dueTime) return 0;
    if (!a.dueTime) return 1;
    if (!b.dueTime) return -1;
    return a.dueTime.localeCompare(b.dueTime);
  });
}

// ── AllScreen ───────────────────────────────────────────────────────────────

export function AllScreen() {
  const [view, setView]         = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [allTasks, setAllTasks]   = useState<Task[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  async function loadTasks() {
    const tasks = await getAllTasks();
    setAllTasks(tasks);
    return tasks;
  }

  useEffect(() => {
    // IndexedDBがハングしても1.5秒でローディングを必ず解除する
    const fallback = setTimeout(() => setLoading(false), 1500);

    getAllTasks()
      .then(tasks => setAllTasks(tasks))
      .catch((err) => console.error("[all] initial load failed:", err))
      .finally(() => {
        clearTimeout(fallback);
        setLoading(false);
      });

    return () => clearTimeout(fallback);
  }, []);

  // ── Calendar computation ─────────────────────────────────────────────────

  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build dot map: dateStr -> Set<Category>
  const dotMap: Record<string, Set<Category>> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(year, month, d);
    const cats = allTasks
      .filter(t => doesTaskApplyToDate(t, dateStr))
      .map(t => t.category);
    if (cats.length > 0) dotMap[dateStr] = new Set(cats);
  }

  // Build calendar grid (null = padding cell)
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const calendarCells: (string | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateStr(year, month, i + 1)),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  function prevMonth() {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setSelectedDate(null);
  }
  function nextMonth() {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setSelectedDate(null);
  }

  // Selected-date tasks: 繰り返しタスクの完了状態は「その日に完了したか」で上書き
  const selectedDateTasks = selectedDate
    ? sortByTime(
        allTasks
          .filter(t => doesTaskApplyToDate(t, selectedDate))
          .map(t => {
            if (t.recurrence !== "none") {
              const completedOnDate = t.completedAt?.slice(0, 10) === selectedDate;
              return { ...t, completed: completedOnDate };
            }
            return t;
          })
      )
    : [];

  // ── List computation ─────────────────────────────────────────────────────

  const today = todayDateString();

  const filteredTasks = allTasks
    .filter(t => categoryFilter === "all" || t.category === categoryFilter)
    .map(t => {
      // 繰り返しタスクは「今日完了したか」だけを completed として扱う
      if (t.recurrence !== "none") {
        const completedToday = t.completedAt?.slice(0, 10) === today;
        return { ...t, completed: completedToday };
      }
      return t;
    })
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (!a.dueTime && !b.dueTime) return 0;
      if (!a.dueTime) return 1;
      if (!b.dueTime) return -1;
      return a.dueTime.localeCompare(b.dueTime);
    });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="px-4 pt-8 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          全タスク
        </h1>
        {/* Calendar / List toggle */}
        <div className="flex items-center rounded-xl bg-muted p-1 gap-1">
          <button
            type="button"
            onClick={() => setView("calendar")}
            aria-pressed={view === "calendar"}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === "calendar"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Calendar className="size-3.5" />
            カレンダー
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <List className="size-3.5" />
            リスト
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "calc(8rem + env(safe-area-inset-bottom))" }}>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        ) : view === "calendar" ? (
          /* ── CALENDAR VIEW ── */
          <div>
            {/* Month navigation */}
            <div className="flex items-center justify-between px-4 pb-3">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="前月"
                className="flex size-8 items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-transform"
              >
                <ChevronLeft className="size-5 text-foreground" />
              </button>
              <span className="text-base font-bold text-foreground">
                {year}年{month + 1}月
              </span>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="翌月"
                className="flex size-8 items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-transform"
              >
                <ChevronRight className="size-5 text-foreground" />
              </button>
            </div>

            {/* Day-of-week header */}
            <div className="grid grid-cols-7 px-2 mb-1">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={label}
                  className={`text-center text-xs font-medium py-1 ${
                    i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 px-2 gap-y-1">
              {calendarCells.map((dateStr, idx) => {
                if (!dateStr) {
                  return <div key={`pad-${idx}`} />;
                }
                const dayNum    = new Date(dateStr + "T00:00:00").getDate();
                const dayOfWeek = new Date(dateStr + "T00:00:00").getDay();
                const isToday    = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const dots       = dotMap[dateStr];

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() =>
                      setSelectedDate(prev => (prev === dateStr ? null : dateStr))
                    }
                    className={`flex flex-col items-center justify-start rounded-xl px-1 py-1.5 min-h-[56px] transition-colors active:scale-95 ${
                      isSelected
                        ? "bg-orange-500 text-white"
                        : isToday
                        ? "bg-orange-50 border border-orange-300"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium leading-none ${
                        isSelected
                          ? "text-white"
                          : isToday
                          ? "text-orange-600 font-bold"
                          : dayOfWeek === 0
                          ? "text-red-500"
                          : dayOfWeek === 6
                          ? "text-blue-500"
                          : "text-foreground"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {/* Category dots */}
                    {dots && (
                      <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                        {(["job", "university", "life"] as Category[])
                          .filter(c => dots.has(c))
                          .map(c => (
                            <span
                              key={c}
                              className={`size-1.5 rounded-full ${
                                isSelected ? "bg-white" : categoryConfig[c].dot
                              }`}
                            />
                          ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div>
            {/* Category filter tabs */}
            <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
              {CATEGORY_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategoryFilter(value)}
                  className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    categoryFilter === value
                      ? "bg-orange-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Task list */}
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                <div className="mb-4 text-5xl select-none">📋</div>
                <p className="text-base font-semibold text-foreground">タスクがありません</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  右下の「+」ボタンからタスクを追加しましょう
                </p>
              </div>
            ) : (
              <ul className="space-y-2 px-4">
                {filteredTasks.map(task => {
                  const cfg       = categoryConfig[task.category];
                  const recDetail = getRecurrenceDetail(task);
                  const isPast    = task.dueDate < today && !task.completed && task.recurrence === "none";
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => setEditingTask(task)}
                        className={`w-full flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm text-left transition-opacity ${
                          task.completed ? "opacity-50" : ""
                        }`}
                      >
                        <span
                          className={`mt-0.5 size-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${
                            task.completed
                              ? "border-orange-500 bg-orange-500"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {task.completed && (
                            <svg viewBox="0 0 10 8" className="size-2.5 stroke-white" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1,4 4,7 9,1" />
                            </svg>
                          )}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-snug ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className={`text-xs ${isPast ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                              {new Date(task.dueDate + "T00:00:00").toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                              {task.dueTime ? ` ${task.dueTime}` : ""}
                              {isPast ? " (期限切れ)" : ""}
                            </span>
                            {recDetail && (
                              <span className="text-xs text-orange-500 font-medium">
                                🔄 {recDetail}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
        <Link
          href="/"
          className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground"
        >
          <Home className="size-5" />
          <span className="text-xs font-medium">ホーム</span>
        </Link>
        <Link
          href="/all"
          aria-current="page"
          className="flex flex-1 flex-col items-center gap-1 py-3 text-orange-500"
        >
          <Calendar className="size-5" />
          <span className="text-xs font-medium">カレンダー</span>
        </Link>
      </nav>

      {/* FAB */}
      <button
        type="button"
        aria-label="タスクを追加"
        onClick={() => setShowAddModal(true)}
        className="fixed right-4 flex size-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg active:scale-95 transition-transform"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        <Plus className="size-6" />
      </button>

      {/* Selected-date bottom sheet */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in"
          onClick={e => { if (e.target === e.currentTarget) setSelectedDate(null); }}
        >
          <div className="w-full max-w-lg rounded-t-2xl bg-background shadow-xl flex flex-col max-h-[70dvh] animate-slide-up">
            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="text-base font-bold text-foreground">
                {formatDateLabel(selectedDate)}
              </h2>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setSelectedDate(null)}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            {/* Sheet content */}
            <div className="overflow-y-auto px-5" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
              {selectedDateTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  この日のタスクはありません
                </p>
              ) : (
                <ul className="space-y-2">
                  {selectedDateTasks.map(task => {
                    const cfg = categoryConfig[task.category];
                    return (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(null);
                            setEditingTask(task);
                          }}
                          className={`w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm text-left transition-opacity ${
                            task.completed ? "opacity-50" : ""
                          }`}
                        >
                          <span
                            className={`size-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${
                              task.completed
                                ? "border-orange-500 bg-orange-500"
                                : "border-muted-foreground/40"
                            }`}
                          >
                            {task.completed && (
                              <svg viewBox="0 0 10 8" className="size-2.5 stroke-white" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1,4 4,7 9,1" />
                              </svg>
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-snug ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {task.title}
                            </p>
                            {task.dueTime && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{task.dueTime}</p>
                            )}
                          </div>
                          <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <TaskAddModal
          onClose={() => setShowAddModal(false)}
          onTaskCreated={() => loadTasks().catch(console.error)}
        />
      )}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => loadTasks().catch(console.error)}
          onDeleted={() => {
            setEditingTask(null);
            loadTasks().catch(console.error);
          }}
        />
      )}
    </div>
  );
}
