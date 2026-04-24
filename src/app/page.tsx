"use client";

import dynamic from "next/dynamic";

const HomeScreen = dynamic(
  () => import("@/components/home/home-screen").then((m) => ({ default: m.HomeScreen })),
  { ssr: false }
);

export default function Page() {
  return <HomeScreen />;
}
