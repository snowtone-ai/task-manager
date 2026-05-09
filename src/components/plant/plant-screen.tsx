"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Home, Leaf } from "lucide-react";
import { usePlant } from "@/hooks/use-plant";
import { calcProgress, getStageLabel } from "@/lib/domain/plant";
import { PlantParticles } from "./plant-particles";
import { PlantRenderer } from "./plant-renderer";

export default function PlantScreen() {
  const { species, stage, state } = usePlant();
  const [flipped, setFlipped] = useState(true);
  const isBlooming = stage >= 4;
  const progress = calcProgress(state?.weeklyCompleted ?? 0, stage);

  useEffect(() => {
    const timer = setTimeout(() => setFlipped(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`flex min-h-dvh flex-col bg-background ${flipped ? "flip-enter" : ""}`}>
      <div className="flex flex-1 flex-col items-center justify-center px-4" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
        <div className="mb-4 text-center">
          <p className="text-2xl font-bold text-foreground">{species.name}</p>
          <p className="text-sm text-muted-foreground">
            {getStageLabel(stage)} · 今週 {state?.weeklyCompleted ?? 0}件完了
          </p>
        </div>

        <div className="relative h-[400px] w-[300px]">
          <PlantRenderer species={species} stage={stage} />
          <PlantParticles color={species.color} active={isBlooming} />
        </div>

        {stage < 5 ? (
          <div className="mt-6 w-64">
            <p className="mb-1 text-center text-xs text-muted-foreground">次のステージまで</p>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm font-semibold text-green-600">
            満開です！タスクを完了し続けて維持しましょう
          </p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <Link href="/" className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground">
        <Home className="size-5" />
        <span className="text-xs font-medium">ホーム</span>
      </Link>
      <Link href="/all" className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground">
        <Calendar className="size-5" />
        <span className="text-xs font-medium">カレンダー</span>
      </Link>
      <Link href="/plant" aria-current="page" className="flex flex-1 flex-col items-center gap-1 py-3 text-orange-500">
        <Leaf className="size-5" />
        <span className="text-xs font-medium">植物</span>
      </Link>
    </nav>
  );
}
