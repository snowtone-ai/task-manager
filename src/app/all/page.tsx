"use client";

import dynamic from "next/dynamic";

const AllScreen = dynamic(
  () => import("@/components/all/all-screen").then((m) => ({ default: m.AllScreen })),
  { ssr: false }
);

export default function AllPage() {
  return <AllScreen />;
}
