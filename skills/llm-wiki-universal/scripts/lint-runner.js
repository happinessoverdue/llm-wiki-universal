#!/usr/bin/env node
'use strict';

// lint-runner.js — wiki 机械健康检查
// 用法：node lint-runner.js <wiki_root>
// 输出：结构化文本报告（供 AI 后续分析使用）
// 退出码：0 = 运行完成，1 = 脚本错误（路径不存在、wiki 结构不完整）

const fs = require('fs');
const path = require('path');

const wikiRoot = process.argv[2] || '.';
const wikiDir = path.join(wikiRoot, 'wiki');
const indexFile = path.join(wikiRoot, 'index.md');

if (!fs.existsSync(wikiDir)) {
  process.stderr.write(`ERROR: wiki 目录不存在：${wikiDir}\n`);
  process.stderr.write('       请确认路径正确，或先运行 init 工作流初始化知识库。\n');
  process.exit(1);
}
if (!fs.existsSync(indexFile)) {
  process.stderr.write(`ERROR: index.md 不存在：${indexFile}\n`);
  process.exit(1);
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

// 递归收集目录下所有 .md 文件
function collectMdFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

// 从 markdown 内容中提取所有 [[Link]] 和 [[Link|别名]] 中的页面名
function extractWikiLinks(content) {
  const links = new Set();
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const inner = m[1].split('|')[0].trim();
    if (inner) links.add(inner);
  }
  return links;
}

// 检查 wiki/ 目录下是否存在 <name>.md（任意子目录）
function wikiPageExists(name, allMdFiles) {
  const target = name + '.md';
  return allMdFiles.some(f => path.basename(f) === target);
}

// ─── 报告开始 ─────────────────────────────────────────────────────────────

const now = new Date();
const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

process.stdout.write('=== llm-wiki lint 报告 ===\n');
process.stdout.write(`时间：${dateStr}\n`);
process.stdout.write(`检查路径：${wikiDir}\n`);
process.stdout.write('\n');

const allMdFiles = collectMdFiles(wikiDir);

// ─── 检查 1：孤立页面 ─────────────────────────────────────────────────────
// 定义：entities/ 下没有被其他 wiki 页面用 [[名称]] 引用

process.stdout.write('--- 孤立页面（entities/ 下没有被其他页面引用） ---\n');

const entitiesDir = path.join(wikiDir, 'entities');
const entityFiles = fs.existsSync(entitiesDir)
  ? fs.readdirSync(entitiesDir).filter(f => f.endsWith('.md'))
  : [];

// 建立所有非 entity 页面（以及 entity 页面本身的其他引用）对 [[Name]] 的引用集合
const allLinksInWiki = new Set();
for (const f of allMdFiles) {
  for (const link of extractWikiLinks(readFileSafe(f))) {
    allLinksInWiki.add(link);
  }
}

let orphanCount = 0;
for (const entityFile of entityFiles) {
  const name = path.basename(entityFile, '.md');
  // 检查除了自身以外是否有任何页面链接到它
  let referencedByOther = false;
  for (const f of allMdFiles) {
    if (path.basename(f) === entityFile) continue;
    if (extractWikiLinks(readFileSafe(f)).has(name)) {
      referencedByOther = true;
      break;
    }
  }
  if (!referencedByOther) {
    process.stdout.write(`  孤立: ${name}\n`);
    orphanCount++;
  }
}
if (orphanCount === 0) process.stdout.write('  （无孤立页面）\n');
process.stdout.write('\n');

// ─── 检查 2：断链 ─────────────────────────────────────────────────────────
// 定义：wiki/ 下有 [[X]] 链接，但找不到 X.md

process.stdout.write('--- 断链（被链接但不存在的页面） ---\n');

const allLinksSet = new Set();
for (const f of allMdFiles) {
  for (const link of extractWikiLinks(readFileSafe(f))) {
    allLinksSet.add(link);
  }
}

let brokenCount = 0;
for (const link of [...allLinksSet].sort()) {
  if (!wikiPageExists(link, allMdFiles)) {
    process.stdout.write(`  断链: [[${link}]]\n`);
    brokenCount++;
  }
}
if (brokenCount === 0) process.stdout.write('  （无断链）\n');
process.stdout.write('\n');

// ─── 检查 3：index 一致性 ─────────────────────────────────────────────────
// 定义：index.md 里有 [[X]] 记录，但 wiki/ 找不到 X.md

process.stdout.write('--- index 一致性（index.md 有记录但文件缺失） ---\n');

const indexLinks = extractWikiLinks(readFileSafe(indexFile));
let missingCount = 0;
for (const link of [...indexLinks].sort()) {
  if (!wikiPageExists(link, allMdFiles)) {
    process.stdout.write(`  index 有但文件缺失: ${link}\n`);
    missingCount++;
  }
}
if (missingCount === 0) process.stdout.write('  （index 与文件一致）\n');
process.stdout.write('\n');

process.stdout.write('=== 机械检查完成。矛盾检测、交叉引用、置信度抽查由 AI 继续执行 ===\n');
process.exit(0);
