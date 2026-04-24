"use client";

import dynamic from "next/dynamic";

const LoadingFallback = () => (
  <div className="flex min-h-dvh items-center justify-center bg-background">
    <p className="text-sm text-muted-foreground">読み込み中...</p>
  </div>
);

const HomeScreen = dynamic(
  () =>
    import("@/components/home/home-screen").then((m) => ({
      default: m.HomeScreen,
    })),
  { ssr: false, loading: LoadingFallback }
);

export default function Page() {
  return <HomeScreen />;
}
