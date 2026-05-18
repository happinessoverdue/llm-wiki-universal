#!/usr/bin/env node
'use strict';

// llm-wiki 删除辅助脚本
// 用法：node delete-helper.js scan-refs <wiki_root> <素材文件名>

const fs = require('fs');
const path = require('path');

function usage() {
  process.stderr.write(`用法：
  node delete-helper.js scan-refs <wiki_root> <素材文件名>
`);
}

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

function scanRefs(wikiRoot, needle) {
  if (!needle) {
    process.stderr.write('素材文件名不能为空\n');
    process.exit(1);
  }

  const wikiDir = path.join(wikiRoot, 'wiki');
  if (!fs.existsSync(wikiDir)) {
    process.stderr.write(`知识库目录不存在：${wikiDir}\n`);
    process.exit(1);
  }

  const files = collectMdFiles(wikiDir);
  const seen = new Set();
  const matches = [];

  for (const filePath of files) {
    const real = path.resolve(filePath);
    if (seen.has(real)) continue;
    seen.add(real);

    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    if (content.includes(needle)) {
      matches.push(real);
    }
  }

  matches.sort();
  const rootReal = path.resolve(wikiRoot);
  for (const filePath of matches) {
    process.stdout.write(path.relative(rootReal, filePath) + '\n');
  }
}

// ─── CLI 入口 ───────────────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

switch (command) {
  case 'scan-refs':
    if (args.length !== 2) { usage(); process.exit(1); }
    scanRefs(args[0], args[1]);
    break;
  default:
    usage();
    process.exit(1);
}
