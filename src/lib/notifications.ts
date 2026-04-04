import { getTasksForDate } from "./taskDb";

function dateString(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type NotificationPermissionState =
  | NotificationPermission
  | "unsupported";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window))
    return "denied";
  return Notification.requestPermission();
}

/** すべてのタスクをもとに通知をService Workerへスケジュール送信する */
export async function scheduleTaskNotifications(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;

  const sw = await navigator.serviceWorker.ready;
  if (!sw.active) return;

  const today = dateString(0);
  const tomorrow = dateString(1);

  const [todayTasks, tomorrowTasks] = await Promise.all([
    getTasksForDate(today),
    getTasksForDate(tomorrow),
  ]);

  const now = new Date();

  // 今日の朝9:00
  const todayAt9 = new Date();
  todayAt9.setHours(9, 0, 0, 0);

  type NotifPayload = {
    id: string;
    title: string;
    body: string;
    scheduledAt: number;
  };

  const notifications: NotifPayload[] = [];

  if (todayAt9 > now) {
    // 未完了の今日タスク → 今日 9:00 に「今日」通知
    for (const task of todayTasks.filter((t) => !t.completed)) {
      const timeLabel = task.dueTime ? `（${task.dueTime}）` : "";
      notifications.push({
        id: `notif-today-${task.id}`,
        title: "今日の締切",
        body: `今日: ${task.title}${timeLabel}`,
        scheduledAt: todayAt9.getTime(),
      });
    }

    // 未完了の明日タスク → 今日 9:00 に「明日」前日通知
    for (const task of tomorrowTasks.filter((t) => !t.completed)) {
      const timeLabel = task.dueTime ? `（${task.dueTime}）` : "";
      notifications.push({
        id: `notif-tomorrow-${task.id}`,
        title: "明日の締切リマインダー",
        body: `明日: ${task.title}${timeLabel}`,
        scheduledAt: todayAt9.getTime(),
      });
    }
  }

  sw.active.postMessage({
    type: "SCHEDULE_NOTIFICATIONS",
    notifications,
  });
}

/** テスト通知を即時送信する（動作確認用） */
export async function sendTestNotification(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (Notification.permission !== "granted") return;

  const sw = await navigator.serviceWorker.ready;
  sw.active?.postMessage({ type: "TEST_NOTIFICATION" });
}
