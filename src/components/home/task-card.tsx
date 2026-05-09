"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { type Task } from "@/lib/db";
import { CATEGORY_CONFIG } from "@/lib/domain/category";

interface TaskCardProps {
  task: Task;
  onToggle: (taskId: string) => Promise<void>;
  onTap: (task: Task) => void;
}

export function TaskCard({ task, onToggle, onTap }: TaskCardProps) {
  const config = CATEGORY_CONFIG[task.category];
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
      className={`rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-opacity duration-300 ${
        task.completed ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
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

          <span
            className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
          >
            {config.label}
          </span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          className="p-1 text-muted-foreground"
          aria-label={expanded ? "折りたたむ" : "展開する"}
        >
          <ChevronDown className={`size-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>
      {expanded && (
        <div className="mt-2 border-t border-border/50 pt-2 pl-9 pr-4 pb-1 text-xs text-muted-foreground">
          <p className="whitespace-pre-wrap leading-relaxed">
            {task.description?.trim() || "詳細はありません"}
          </p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => onTap(task)} className="text-orange-500 underline">
              編集
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
