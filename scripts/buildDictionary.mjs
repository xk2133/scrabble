/**
 * 从 ecict npm 包提取英汉词典 → public/dict.json
 * 用法: node scripts/buildDictionary.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'node_modules', 'ecdict', 'data', 'dict.json');
const OUT = join(ROOT, 'public', 'dict.json');

if (!existsSync(SRC)) {
  console.error('[dict] 错误: 请先运行 npm install');
  process.exit(1);
}

console.log('[dict] 加载 ecdict 数据...');
const raw = JSON.parse(readFileSync(SRC, 'utf-8'));
console.log(`[dict] 原始词条: ${Object.keys(raw).length}`);

const dict = {};
let kept = 0;

for (const entry of Object.values(raw)) {
  const { word, translation } = entry;
  if (!word || !translation) continue;
  const w = word.toLowerCase().trim();
  // 只保留纯字母单词 2-15 字符
  if (!/^[a-z]{2,15}$/.test(w)) continue;
  // 取第一段释义
  const short = translation.split(/[；;，,\n\\n]/)[0].trim();
  dict[w] = short;
  kept++;
}

console.log(`[dict] 有效词条: ${kept}`);

const outDir = dirname(OUT);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const json = JSON.stringify(dict);
writeFileSync(OUT, json, 'utf-8');
console.log(`[dict] 输出: ${OUT} (${(json.length / 1024 / 1024).toFixed(1)} MB)`);
