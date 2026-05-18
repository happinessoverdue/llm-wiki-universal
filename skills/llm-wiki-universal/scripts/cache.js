#!/usr/bin/env node
'use strict';

// llm-wiki 缓存脚本（SHA-256 内容哈希，JSON 存储）
// 用法：
//   node cache.js check <file>
//   node cache.js update <file> <source_page>
//   node cache.js invalidate <file>

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

function usage() {
  process.stderr.write(`用法：
  node cache.js check <file>
  node cache.js update <file> <source_page>
  node cache.js invalidate <file>
`);
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    process.stderr.write(`文件不存在：${filePath}\n`);
    process.exit(1);
  }
}

function findWikiRoot(filePath) {
  let dir = path.resolve(path.dirname(filePath));
  while (true) {
    if (
      fs.existsSync(path.join(dir, '.wiki-cache.json')) ||
      fs.existsSync(path.join(dir, 'wiki-schema.md'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function cacheFilePath(wikiRoot) {
  return path.join(wikiRoot, '.wiki-cache.json');
}

function ensureCacheFile(cacheFile) {
  if (!fs.existsSync(cacheFile)) {
    fs.writeFileSync(cacheFile, JSON.stringify({ version: 1, entries: {} }, null, 2) + '\n');
  }
}

function fileHash(relativePath, filePath) {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from(relativePath, 'utf8'));
  hash.update(Buffer.from('\0'));
  hash.update(content);
  return 'sha256:' + hash.digest('hex');
}

function normalizedSourcePage(wikiRoot, sourcePage) {
  if (!sourcePage) return '';
  if (path.isAbsolute(sourcePage)) {
    const resolved = path.resolve(sourcePage);
    const rootResolved = path.resolve(wikiRoot);
    const rel = path.relative(rootResolved, resolved);
    // Only relativize if the source page is inside the wiki root
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
      return rel;
    }
    return sourcePage;
  }
  return sourcePage;
}

function cacheCheck(filePath) {
  requireFile(filePath);
  const absPath = path.resolve(filePath);
  const wikiRoot = findWikiRoot(absPath);
  if (!wikiRoot) {
    process.stderr.write(`未找到知识库根目录：${filePath}\n`);
    process.exit(1);
  }

  const cacheFile = cacheFilePath(wikiRoot);
  if (!fs.existsSync(cacheFile)) {
    process.stdout.write('MISS\n');
    return;
  }

  const relativePath = path.relative(wikiRoot, absPath);
  const currentHash = fileHash(relativePath, absPath);
  const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const entry = (data.entries || {})[relativePath];

  if (!entry || entry.hash !== currentHash || !entry.source_page) {
    process.stdout.write('MISS\n');
    return;
  }

  const sourcePath = path.isAbsolute(entry.source_page)
    ? entry.source_page
    : path.join(wikiRoot, entry.source_page);

  process.stdout.write(fs.existsSync(sourcePath) ? 'HIT\n' : 'MISS\n');
}

function cacheUpdate(filePath, sourcePage) {
  requireFile(filePath);
  const absPath = path.resolve(filePath);
  const wikiRoot = findWikiRoot(absPath);
  if (!wikiRoot) {
    process.stderr.write(`未找到知识库根目录：${filePath}\n`);
    process.exit(1);
  }

  const cacheFile = cacheFilePath(wikiRoot);
  ensureCacheFile(cacheFile);

  const relativePath = path.relative(wikiRoot, absPath);
  const currentHash = fileHash(relativePath, absPath);
  const normalizedSource = normalizedSourcePage(wikiRoot, sourcePage);
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  if (!data.entries) data.entries = {};
  data.entries[relativePath] = {
    hash: currentHash,
    ingested_at: timestamp,
    source_page: normalizedSource,
  };

  const tmp = cacheFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, cacheFile);
  process.stdout.write('UPDATED\n');
}

function cacheInvalidate(filePath) {
  // 不要求文件存在（级联删除场景中文件可能已被删除）
  const absPath = path.resolve(filePath);
  const wikiRoot = findWikiRoot(absPath) || findWikiRootByPath(absPath);
  if (!wikiRoot) {
    process.stderr.write(`未找到知识库根目录：${filePath}\n`);
    process.exit(1);
  }

  const cacheFile = cacheFilePath(wikiRoot);
  if (!fs.existsSync(cacheFile)) {
    process.stdout.write('INVALIDATED\n');
    return;
  }

  const relativePath = path.relative(wikiRoot, absPath);
  const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  if (data.entries) delete data.entries[relativePath];

  const tmp = cacheFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, cacheFile);
  process.stdout.write('INVALIDATED\n');
}

// 备用：当文件已删除时，向上遍历路径查找知识库根
function findWikiRootByPath(absPath) {
  let dir = path.dirname(absPath);
  while (true) {
    if (
      fs.existsSync(path.join(dir, '.wiki-cache.json')) ||
      fs.existsSync(path.join(dir, 'wiki-schema.md'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// ─── CLI 入口 ───────────────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

switch (command) {
  case 'check':
    if (args.length !== 1) { usage(); process.exit(1); }
    cacheCheck(args[0]);
    break;
  case 'update':
    if (args.length !== 2) { usage(); process.exit(1); }
    cacheUpdate(args[0], args[1]);
    break;
  case 'invalidate':
    if (args.length !== 1) { usage(); process.exit(1); }
    cacheInvalidate(args[0]);
    break;
  default:
    usage();
    process.exit(1);
}
