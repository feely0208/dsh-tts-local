/**
 * dsh-tts-local —— 本地语音合成内核
 *
 * 通道：macOS `say` 命令（系统内置，零依赖零 Key）
 * - 多音色：Ting-Ting（中文女声）/ Mei-Jia（台湾国语）/ Sin-ji（粤语）等
 * - 输出 AIFF → afconvert 转 WAV
 * - 完全离线、零成本、零 Key
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, basename, extname, resolve } from 'node:path';

export const RATE_SNAPSHOT = 'macOS say 命令 · 系统内置 · 零成本';

/** 列出可用的音色 */
export function listVoices() {
  const r = spawnSync('say', ['-v', '?'], { encoding: 'utf-8', timeout: 10_000 });
  if (r.status !== 0) return [];
  return r.stdout.split('\n').filter(l => l.trim()).map(l => {
    const m = l.match(/^(.+?)\s{2,}(\S+)\s+(.+)$/);
    return m ? { name: m[1].trim(), lang: m[2], description: m[3].trim() } : null;
  }).filter(Boolean);
}

/** 找中文音色 */
export function findChineseVoice() {
  return listVoices().filter(v => v.lang.startsWith('zh'))[0] || null;
}

/** 合成文本 → 音频文件（say 系统内置，AIFF 输出 → afconvert 转 WAV） */
export function ttsText(text, { voice = 'Ting-Ting', rate = 180, outFile } = {}) {
  const tmpAiff = (outFile || '/tmp/dsh-tts.aiff').replace(/\.\w+$/, '.aiff');
  const r = spawnSync('say', ['-v', voice, '-r', String(rate), '-o', tmpAiff, text], { encoding: 'utf-8', timeout: 120_000 });
  if (r.status !== 0) throw new Error('say 命令失败：' + (r.stderr || '').slice(0, 200));
  // AIFF → WAV（afconvert 系统内置）
  const wavOut = tmpAiff.replace(/\.aiff$/, '.wav');
  spawnSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16', tmpAiff, wavOut], { encoding: 'utf-8', timeout: 30_000 });
  if (existsSync(wavOut)) { try { unlinkSync(tmpAiff); } catch {} }
  return { outFile: existsSync(wavOut) ? wavOut : tmpAiff, chars: text.length };
}

export { readFileSync, writeFileSync, mkdirSync, existsSync, join, basename, resolve };
