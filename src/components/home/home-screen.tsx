"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, Calendar, Plus } from "lucide-react";
import confetti from "canvas-confetti";
import { type Task } from "@/lib/db";
import {
  getTasksForDate,
  toggleTaskComplete,
  recordStreak,
  getCurrentStreakCount,
} from "@/lib/taskDb";
import {
  getNotificationPermission,
  requestNotificationPermission,
  scheduleTaskNotifications,
  sendTestNotification,
  type NotificationPermissionState,
} from "@/lib/notifications";
import { TaskCard } from "./task-card";
import { TaskAddModal } from "./task-add-modal";
import { TaskEditModal } from "./task-edit-modal";
import { VoiceInputButton } from "./voice-input-button";

function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fireNormalConfetti() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    colors: ["#f97316", "#fb923c", "#fbbf24", "#a3e635", "#34d399"],
  });
}

function fireAllCompleteConfetti() {
  // Left burst
  confetti({
    particleCount: 120,
    angle: 60,
    spread: 70,
    origin: { x: 0, y: 0.6 },
    colors: ["#f97316", "#fb923c", "#fbbf24", "#a3e635", "#34d399", "#60a5fa"],
  });
  // Right burst
  confetti({
    particleCount: 120,
    angle: 120,
    spread: 70,
    origin: { x: 1, y: 0.6 },
    colors: ["#f97316", "#fb923c", "#fbbf24", "#a3e635", "#34d399", "#60a5fa"],
  });
  // Center burst after short delay
  setTimeout(() => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      colors: ["#f97316", "#fbbf24", "#34d399", "#60a5fa", "#c084fc"],
    });
  }, 200);
}

export function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalInitialTitle, setAddModalInitialTitle] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [allCompleteMessage, setAllCompleteMessage] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermissionState>("unsupported");
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(false);
  const [testNotifSent, setTestNotifSent] = useState(false);

  const today = todayDateString();

  async function loadTasks() {
    const loaded = await getTasksForDate(today);
    setTasks(loaded);
    return loaded;
  }

  async function refreshStreak() {
    const count = await getCurrentStreakCount();
    setStreakCount(count);
  }

  useEffect(() => {
    // 通知許可やlocalStorage読取で例外が起きても、後続のタスクロードとフォールバックを必ず走らせる
    try {
      setNotifPermission(getNotificationPermission());
    } catch (err) {
      console.error("[home] notif permission check failed:", err);
    }
    try {
      const dismissed = localStorage.getItem("notif-banner-dismissed") === "1";
      setNotifBannerDismissed(dismissed);
    } catch (err) {
      console.error("[home] localStorage read failed:", err);
    }

    // IndexedDBがハングしても1.5秒でローディングを必ず解除する
    const fallback = setTimeout(() => setLoading(false), 1500);

    Promise.all([loadTasks(), refreshStreak()])
      .catch((err) => console.error("[home] initial load failed:", err))
      .finally(() => {
        clearTimeout(fallback);
        setLoading(false);
      });

    return () => clearTimeout(fallback);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  // 通知許可済みなら起動時にスケジュール送信
  useEffect(() => {
    if (notifPermission === "granted") {
      scheduleTaskNotifications().catch(console.error);
    }
  }, [notifPermission]);

  async function handleRequestNotification() {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") {
      await scheduleTaskNotifications();
    }
  }

  function handleDismissNotifBanner() {
    localStorage.setItem("notif-banner-dismissed", "1");
    setNotifBannerDismissed(true);
  }

  async function handleTestNotification() {
    await sendTestNotification();
    setTestNotifSent(true);
    setTimeout(() => setTestNotifSent(false), 3000);
  }

  async function handleToggle(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isCompleting = !task.completed;

    await toggleTaskComplete(taskId);
    const newTasks = await loadTasks();

    const allDone = newTasks.length > 0 && newTasks.every((t) => t.completed);

    if (isCompleting) {
      if (allDone) {
        await recordStreak(today, true);
        await refreshStreak();
        fireAllCompleteConfetti();
        setAllCompleteMessage(true);
        setTimeout(() => setAllCompleteMessage(false), 3000);
      } else {
        fireNormalConfetti();
      }
    } else {
      // タスクを未完了に戻した → 今日は全完了でなくなる
      if (!allDone) {
        await recordStreak(today, false);
        await refreshStreak();
      }
    }

    // 完了状態が変わったら通知スケジュールを更新
    scheduleTaskNotifications().catch(console.error);
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const dateLabel = new Date().toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="px-4 pt-8 pb-3">
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          今日のタスク
        </h1>
      </header>

      {/* Streak display */}
      {streakCount > 0 && (
        <div className="px-4 pb-1">
          <p className="text-sm font-semibold text-orange-500">
            🔥 {streakCount}日連続全完了！
          </p>
        </div>
      )}

      {/* Notification permission banner — show after user has tasks and hasn't dismissed */}
      {!notifBannerDismissed &&
        notifPermission === "default" &&
        tasks.length > 0 && (
          <div className="mx-4 mb-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-700">
                  🔔 締切通知を有効にしますか？
                </p>
                <p className="mt-0.5 text-xs text-orange-600">
                  締切前日・当日の朝9時にリマインドします
                </p>
              </div>
              <button
                type="button"
                aria-label="通知バナーを閉じる"
                onClick={handleDismissNotifBanner}
                className="text-orange-400 hover:text-orange-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <button
              type="button"
              onClick={handleRequestNotification}
              className="mt-2 w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white active:scale-95 transition-transform"
            >
              通知を許可する
            </button>
          </div>
        )}

      {/* Notification test button — shown after permission granted */}
      {notifPermission === "granted" && !notifBannerDismissed && (
        <div className="mx-4 mb-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-green-700">
              🔔 通知が有効です
            </p>
            <button
              type="button"
              onClick={handleDismissNotifBanner}
              className="text-green-400 hover:text-green-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <button
            type="button"
            onClick={handleTestNotification}
            className="mt-2 w-full rounded-lg border border-green-300 bg-white py-2 text-sm font-semibold text-green-700 active:scale-95 transition-transform"
          >
            {testNotifSent ? "✓ 送信しました！" : "テスト通知を送る"}
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>{totalCount > 0 ? `${completedCount}/${totalCount} 完了` : "タスクなし"}</span>
          {totalCount > 0 && completedCount === totalCount && (
            <span className="font-semibold text-orange-500">全完了！</span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* All-complete celebration banner */}
      {allCompleteMessage && (
        <div className="mx-4 mb-2 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-center animate-bounce">
          <p className="text-sm font-bold text-orange-600">🎉 全タスク完了！すごい！</p>
        </div>
      )}

      {/* Task list */}
      <main className="flex-1 px-4 pt-2" style={{ paddingBottom: "calc(8rem + env(safe-area-inset-bottom))" }}>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        ) : tasks.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 text-6xl select-none">🎉</div>
            <p className="text-base font-semibold text-foreground">
              今日のタスクはありません
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              右下の「+」ボタンからタスクを追加しましょう
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  onToggle={handleToggle}
                  onTap={setEditingTask}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
        <Link
          href="/"
          className="flex flex-1 flex-col items-center gap-1 py-3 text-orange-500"
          aria-current="page"
        >
          <Home className="size-5" />
          <span className="text-xs font-medium">ホーム</span>
        </Link>
        <Link
          href="/all"
          className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground"
        >
          <Calendar className="size-5" />
          <span className="text-xs font-medium">カレンダー</span>
        </Link>
      </nav>

      {/* FABs */}
      <div
        className="fixed right-4 flex flex-col items-end gap-3"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        {/* Voice input FAB */}
        <VoiceInputButton
          onTaskCreated={() => {
            loadTasks().catch(console.error);
            scheduleTaskNotifications().catch(console.error);
          }}
          onFallbackToManual={(prefill) => {
            setAddModalInitialTitle(prefill ?? "");
            setShowAddModal(true);
          }}
        />
        {/* Add task FAB */}
        <button
          type="button"
          aria-label="タスクを追加"
          onClick={() => {
            setAddModalInitialTitle("");
            setShowAddModal(true);
          }}
          className="flex size-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="size-6" />
        </button>
      </div>

      {/* Task Add Modal */}
      {showAddModal && (
        <TaskAddModal
          onClose={() => setShowAddModal(false)}
          onTaskCreated={() => {
            loadTasks().catch(console.error);
            scheduleTaskNotifications().catch(console.error);
          }}
          initialTitle={addModalInitialTitle}
        />
      )}

      {/* Task Edit Modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => {
            loadTasks().catch(console.error);
            scheduleTaskNotifications().catch(console.error);
          }}
          onDeleted={() => {
            loadTasks().catch(console.error);
            scheduleTaskNotifications().catch(console.error);
          }}
        />
      )}
    </div>
  );
}
