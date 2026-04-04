"use client";

import { useState } from "react";
import { type Task } from "@/lib/db";

const categoryConfig = {
  job: { label: "就活", bg: "bg-blue-100", text: "text-blue-700" },
  university: { label: "大学", bg: "bg-green-100", text: "text-green-700" },
  life: { label: "生活", bg: "bg-purple-100", text: "text-purple-700" },
} as const;

interface TaskCardProps {
  task: Task;
  onToggle: (taskId: string) => Promise<void>;
  onTap: (task: Task) => void;
}

export function TaskCard({ task, onToggle, onTap }: TaskCardProps) {
  const config = categoryConfig[task.category];
  const [busy, setBusy] = useState(false);

  async function handleCheck() {
    if (busy) return;
    setBusy(true);
    try {
      await onToggle(task.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-opacity duration-300 ${
        task.completed ? "opacity-50" : ""
      }`}
    >
      {/* Circle checkbox */}
      <button
        type="button"
        aria-label={task.completed ? "完了を取り消す" : "タスクを完了にする"}
        disabled={busy}
        onClick={handleCheck}
        className={`size-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors active:scale-90 ${
          task.completed
            ? "border-orange-500 bg-orange-500"
            : "border-muted-foreground/40"
        } ${busy ? "opacity-50" : ""}`}
      >
        {task.completed && (
          <svg
            viewBox="0 0 10 8"
            className="size-3 stroke-white"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1,4 4,7 9,1" />
          </svg>
        )}
      </button>

      {/* Content — tapping opens edit modal */}
      <button
        type="button"
        onClick={() => onTap(task)}
        className="flex flex-1 min-w-0 items-center gap-3 text-left"
        aria-label="タスクを編集"
      >
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium leading-snug transition-all duration-300 ${
              task.completed
                ? "line-through text-muted-foreground"
                : "text-foreground"
            }`}
          >
            {task.title}
          </p>
          {task.dueTime && (
            <p className="mt-0.5 text-xs text-muted-foreground">{task.dueTime}</p>
          )}
        </div>

        {/* Category badge */}
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
        >
          {config.label}
        </span>
      </button>
    </div>
  );
}
