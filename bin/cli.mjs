#!/usr/bin/env node
/**
 * dsh-tts-local —— 本地语音合成（macOS say，零 Key 零成本零网络）
 * 用法：
 *   dsh-tts-local --dir <目录> [--voice Ting-Ting] [--out 目录] [--json]
 *   dsh-tts-local --text "要合成的文字" [--voice ...] [--out 目录]
 *   dsh-tts-local --voices                       # 列出可用音色
 * 输出：每个文本文件一个 .aiff（可 afconvert 转 .wav）
 */
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { listVoices, ttsText } from '../lib/index.js';

const args = process.argv.slice(2);
const has = (k) => args.includes('--' + k);
const val = (k, d = '') => {
  const i = args.indexOf('--' + k);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};

if (has('voices')) { console.log(JSON.stringify(listVoices().filter(v => /zh|Chinese/i.test(v.lang + v.description)), null, 2)); process.exit(0); }
if (has('text')) {
  const out = resolve(val('out', process.cwd()));
  mkdirSync(out, { recursive: true });
  const text = val('text');
  const voice = val('voice', 'Ting-Ting');
  const r = ttsText(text, { voice, outFile: join(out, 'tts-output.aiff') });
  console.log(`✅ 音频已生成：${r.outFile}（${r.chars} 字符）`);
  process.exit(0);
}

if (has('help') || !has('dir')) {
  console.log(`dsh-tts-local —— 本地语音合成（macOS say，零 Key 零成本零网络）

用法：
  dsh-tts-local --dir <目录> [--voice Ting-Ting] [--out 目录] [--json]
  dsh-tts-local --text "要合成的文字" [--voice ...] [--out 目录]
  dsh-tts-local --voices                        # 列出可用音色
输出：每个文本文件一个 .aiff（macOS QuickTime 直接播放；afconvert 可转 .wav）。`);
  process.exit(0);
}

const dir = resolve(val('dir'));
const voice = val('voice', 'Ting-Ting');
const files = readdirSync(dir, { withFileTypes: true })
  .filter(e => e.isFile() && ['.md', '.txt'].includes((e.name.match(/\.[^.]+$/)?.[0] || '').toLowerCase()))
  .map(e => join(dir, e.name));
if (!files.length) { console.error('❌ 目录里没有 .md 或 .txt 文件'); process.exit(2); }
const outDir = resolve(val('out', join(dir, 'tts-out')));
mkdirSync(outDir, { recursive: true });

const results = [];
let ok = 0, fail = 0;
for (const f of files) {
  const name = f.split('/').pop();
  try {
    const text = readFileSync(f, 'utf-8');
    const outName = name.replace(/\.\w+$/, '') + '.aiff';
    const r = ttsText(text, { voice, outFile: join(outDir, outName) });
    ok += 1;
    results.push({ file: name, ok: true, out: r.outFile, chars: r.chars });
    if (!has('json')) console.log(`✅ ${name} → ${r.outFile}（${r.chars} 字符）`);
  } catch (e) {
    fail += 1;
    results.push({ file: name, ok: false, error: String(e.message || e) });
    if (!has('json')) console.log(`❌ ${name}  ${String(e.message || e).slice(0, 120)}`);
  }
}
if (has('json')) console.log(JSON.stringify({ ok, fail, results }, null, 2));
else console.log(`\n合成完成：成功 ${ok} · 失败 ${fail} · 输出目录 ${outDir}`);
process.exit(fail ? 1 : 0);
