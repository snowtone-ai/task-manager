import { type Category } from "@/lib/db";
export { CATEGORY_CONFIG as categoryConfig } from "@/lib/domain/category";

export const CATEGORY_FILTERS: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "job", label: "就活" },
  { value: "university", label: "大学" },
  { value: "life", label: "生活" },
];
