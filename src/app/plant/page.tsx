"use client";

import dynamic from "next/dynamic";

const PlantScreen = dynamic(() => import("@/components/plant/plant-screen"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center">
      <p className="text-sm text-muted-foreground">読み込み中...</p>
    </div>
  ),
});

export default function PlantPage() {
  return <PlantScreen />;
}
