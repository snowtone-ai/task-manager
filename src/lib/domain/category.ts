import type { Category } from "@/lib/db";

export const CATEGORY_CONFIG: Record<
  Category,
  {
    label: string;
    bg: string;
    text: string;
    dot: string;
    active: string;
    outline: string;
  }
> = {
  job: {
    label: "就活",
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
    active: "bg-blue-500 text-white",
    outline: "border-blue-500 text-blue-500",
  },
  university: {
    label: "大学",
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
    active: "bg-green-500 text-white",
    outline: "border-green-500 text-green-500",
  },
  life: {
    label: "生活",
    bg: "bg-purple-100",
    text: "text-purple-700",
    dot: "bg-purple-500",
    active: "bg-purple-500 text-white",
    outline: "border-purple-500 text-purple-500",
  },
};

export const CATEGORY_LIST: { value: Category; label: string }[] = [
  { value: "job", label: "就活" },
  { value: "university", label: "大学" },
  { value: "life", label: "生活" },
];
