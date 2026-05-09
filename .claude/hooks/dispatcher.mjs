#!/usr/bin/env node
// pm-zero v9.1 — Claude Code Hook Dispatcher
import fs from 'node:fs/promises';
import path from 'node:path';

const REDACT = [
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /Bearer\s+[a-zA-Z0-9._-]+/gi,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  /(password|token|secret|key|authorization)["':=\s]+["']?[^"'\s,}]{8,}/gi,
];

function redact(text) {
  let result = text;
  for (const pattern of REDACT) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

const event = process.argv.find((a) => a.startsWith('--event='))?.split('=')[1];
const projectRoot = path.resolve(import.meta.dirname, '..', '..');

const handlers = {
  async SessionStart() {
    try {
      const stateFile = path.join(projectRoot, 'docs', 'state.md');
      const state = await fs.readFile(stateFile, 'utf-8');
      const current = state.split('## Current')[1]?.split('##')[0]?.trim() || '';
      if (current) {
        const lines = current.split('\n').map((l) => l.trim()).filter(Boolean);
        console.log(`[pm-zero] State: ${lines.join(' | ')}`);
      }
    } catch {
      // docs/state.md が存在しない場合は無視
    }
  },

  async PostToolUseFailure() {
    try {
      const input = process.env.TOOL_RESULT || '';
      if (input) {
        console.error(
          `[pm-zero] Tool failure (redacted): ${redact(input).slice(0, 200)}`
        );
      }
    } catch {
      // hook失敗で本処理を落とさない
    }
  },

  async UserPromptSubmit() {
    try {
      const stateFile = path.join(projectRoot, 'docs', 'state.md');
      const state = await fs.readFile(stateFile, 'utf-8');
      const doneSection = state.split('## Done')[1]?.split('##')[0] || '';
      const doneItems = doneSection.match(/- \[x\] .+/g) || [];
      if (doneItems.length > 0) {
        console.log(
          `[pm-zero] ${doneItems.length} tasks already done. Check state.md before re-implementing.`
        );
      }
    } catch {
      // hook失敗で本処理を落とさない
    }
  },
};

if (event && handlers[event]) {
  try {
    await handlers[event]();
  } catch {
    // hook失敗で本処理を落とさない
  }
}
