import { type Category } from "./db";

export interface ParsedTask {
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string | null; // HH:MM or null
  category: Category;
}

export class RateLimitError extends Error {
  constructor() {
    super("Gemini API rate limit reached");
    this.name = "RateLimitError";
  }
}

export async function parseTaskFromText(
  text: string,
  todayDate: string
): Promise<ParsedTask> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not configured");

  const prompt = `今日の日付は ${todayDate} です。
以下の音声入力テキストからタスク情報を抽出してください。
出力はJSONのみ。余計なテキストなし。マークダウンのコードブロックも不要。

音声入力: "${text}"

以下のJSONフォーマットで出力:
{
  "title": "タスク名（簡潔に）",
  "dueDate": "YYYY-MM-DD（今日の日付基準で計算）",
  "dueTime": "HH:MM または null（時刻指定なしの場合）",
  "category": "job または university または life"
}

カテゴリの判定基準:
- job: 就活、企業、インターン、ES、面接、説明会、OB訪問など
- university: 大学、講義、レポート、課題、試験、ゼミ、授業など
- life: それ以外の日常タスク（買い物、通院、習い事など）`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (response.status === 429) {
    throw new RateLimitError();
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Empty response from Gemini API");

  const parsed = JSON.parse(content) as ParsedTask;

  // Validate required fields
  if (!parsed.title || !parsed.dueDate || !parsed.category) {
    throw new Error("Invalid task structure from Gemini API");
  }

  return parsed;
}
