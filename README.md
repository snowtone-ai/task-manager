# Focus Task Manager PWA

大学生活と就職活動のマルチタスクを整理し、ユーザーが「今、何をすべきか」を瞬時に把握することに特化した、自分専用のタスク管理PWA（Progressive Web App）です。

※自分専用前提で設計しているので、他の人はおそらく使用できません。

## 🌟 プロダクトの核となる特徴
<img src="https://github.com/user-attachments/assets/5f12f74e-33f4-43a5-954c-8152dc73a8d0" width="250">
<img src="https://github.com/user-attachments/assets/877ccc0e-ac1a-457c-aacf-bdf61fa978ba" width="250">

- **AI音声タスク登録**: Gemini 2.5 Flash APIを搭載。曖昧な発話からタスク名・期限・カテゴリを自動抽出し、最小限の操作で登録を完了します。
- **即時報酬デザイン**: タスク完了時に `canvas-confetti` による視覚的な演出を行い、日々の達成感を最大化します。
- **継続の可視化（Streak）**: 毎日の全タスク完了を「🔥 ストリーク」として記録し、継続のモチベーションを維持します。
- **オフラインファースト**: PWA対応および IndexedDB（Dexie.js）の採用により、通信環境に左右されない高速な操作性を実現しています。

## 🛠 技術スタック

2026年時点の最新のモダンWebスタックを採用し、パフォーマンスと保守性を両立させています。

- [cite_start]**Framework**: Next.js 16+ (App Router), React 19 [cite: 2, 4]
- [cite_start]**Styling**: Tailwind CSS v4 (CSS-First Configuration) [cite: 2, 4]
- [cite_start]**Language**: TypeScript (Strict Mode) [cite: 2]
- **AI Integration**: Gemini 2.5 Flash API
- **Local Database**: Dexie.js (IndexedDB)
- [cite_start]**Deployment**: Vercel [cite: 2, 4]
- [cite_start]**Package Manager**: pnpm [cite: 2, 4]

## 🤖 AI-Driven Development (AI協調開発)

[cite_start]このプロジェクトは、AIエージェントと密接に協調する次世代の開発手法で構築されました [cite: 1]。

1. [cite_start]**PMエージェントによる要件定義**: 独自の「要件定義専門PMエージェント」を用いて曖昧なアイデアを `vision.md` に構造化 [cite: 1]。
2. [cite_start]**Claude Code による自律実装**: `CLAUDE.md` に蓄積された地雷回避ルールに基づき、Claude Code がコードの実装・デバッグ・検証（Playwright）を自律的に実行 [cite: 1, 2]。
3. [cite_start]**自己進化プロセス**: 開発中に発生したエラーの教訓を `xp-rules.md` に蓄積し、開発プロセス自体を継続的に改善 [cite: 2]。

## 🚀 セットアップと実行

### 1. 環境変数の設定
`.env.local` ファイルを作成し、以下のキーを設定してください。

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
