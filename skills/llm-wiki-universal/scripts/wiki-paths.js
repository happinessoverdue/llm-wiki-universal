#!/usr/bin/env node
'use strict';

// 多知识库路径注册表管理
// 注册表文件：~/.llm-wiki-paths.json
//
// 注册表格式（仅此一种，~/.llm-wiki-paths.json）：
// {
//   "lastUsed": "/path/to/wiki",
//   "wikis": [
//     { "path": "/path/to/wiki-A", "title": "竞品分析", "aliases": ["竞品库"] }
//   ]
// }
// lastUsed：最近一次通过 add / set-last-used 选用的知识库根路径（可为空字符串 ""）。
//
// 用法：
//   node wiki-paths.js get-last-used
//   node wiki-paths.js list   （输出注册表 JSON，与 ~/.llm-wiki-paths.json 字段一致）
//   node wiki-paths.js add <path> [--title <显示名>] [--alias <俗称>] ...
//   node wiki-paths.js set-names <path> [--title <显示名>] [--alias <俗称>] ...
//   node wiki-paths.js set-last-used <path>
//   node wiki-paths.js remove <path>

const fs = require('fs');
const path = require('path');
const os = require('os');

const REGISTRY_FILE = path.join(os.homedir(), '.llm-wiki-paths.json');

function usage() {
  process.stderr.write(`用法：
  node wiki-paths.js get-last-used
  node wiki-paths.js list   （打印注册表 JSON）
  node wiki-paths.js add <path> [--title <显示名>] [--alias <俗称>] ...
  node wiki-paths.js set-names <path> [--title <显示名>] [--alias <俗称>] ...
  node wiki-paths.js set-last-used <path>
  node wiki-paths.js remove <path>
`);
}

function defaultTitleForPath(normalized) {
  return path.basename(normalized) || normalized;
}

function normalizeEntry(e) {
  const p = typeof e.path === 'string' ? normalizePath(e.path) : '';
  const title = typeof e.title === 'string' && e.title.trim() ? e.title.trim() : defaultTitleForPath(p);
  const aliases = Array.isArray(e.aliases)
    ? e.aliases.map((a) => String(a).trim()).filter(Boolean)
    : [];
  return { path: p, title, aliases };
}

function registryInvalid(message) {
  process.stderr.write(
    `${message}\n` +
      `规定格式：顶层 lastUsed（字符串）、wikis（数组；每项须含 path，可选 title、aliases）。\n` +
      `若注册表内容错误，请先将 ${REGISTRY_FILE} 重命名备份（例如追加 .bak 或时间戳），\n` +
      `再对每个知识库根目录重新执行：wiki-paths.js add "<路径>" [--title ...] [--alias ...]\n`
  );
  process.exit(1);
}

function readRegistry() {
  if (!fs.existsSync(REGISTRY_FILE)) {
    return { lastUsed: '', wikis: [] };
  }

  let data;
  try {
    const raw = fs.readFileSync(REGISTRY_FILE, 'utf8');
    data = JSON.parse(raw);
  } catch {
    registryInvalid('无法解析注册表 JSON（文件损坏或格式不是 JSON）。');
  }

  if (!data || typeof data !== 'object') {
    registryInvalid('注册表内容无效。');
  }

  if (!('lastUsed' in data) || typeof data.lastUsed !== 'string') {
    registryInvalid('注册表格式无效：须包含顶层字段 lastUsed（字符串，可为空字符串）。');
  }

  if (!Array.isArray(data.wikis)) {
    registryInvalid('注册表格式无效：须包含顶层字段 wikis（数组）。');
  }

  const wikis = [];
  for (const e of data.wikis) {
    if (!e || typeof e !== 'object' || typeof e.path !== 'string' || !e.path.trim()) {
      registryInvalid('wikis 中存在无效项（缺少 path）。');
    }
    wikis.push(normalizeEntry(e));
  }

  const lastUsed = data.lastUsed.trim()
    ? normalizePath(String(data.lastUsed))
    : '';

  return { lastUsed, wikis };
}

function writeRegistry(data) {
  const out = {
    lastUsed: data.lastUsed || '',
    wikis: data.wikis.map((e) => ({
      path: e.path,
      title: e.title,
      aliases: e.aliases || [],
    })),
  };
  const tmp = REGISTRY_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(out, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, REGISTRY_FILE);
}

function normalizePath(p) {
  return path.resolve(p.trim());
}

function findWikiIndex(wikis, normalized) {
  return wikis.findIndex((e) => e.path === normalized);
}

/** 解析 [--title x] [--alias y] ...，返回 { title, aliases, restArgs }；restArgs 为路径前的位置参数 */
function parseMetaFlags(argv) {
  const aliases = [];
  let title;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--title' && argv[i + 1]) {
      title = argv[++i];
      continue;
    }
    if (a === '--alias' && argv[i + 1]) {
      aliases.push(argv[++i]);
      continue;
    }
    rest.push(a);
  }
  return { title, aliases, rest };
}

function mergeAliases(existing, add) {
  const set = new Set(
    (existing || []).map((s) => s.toLowerCase())
  );
  const out = [...(existing || [])];
  for (const a of add || []) {
    const k = a.toLowerCase();
    if (!set.has(k)) {
      set.add(k);
      out.push(a);
    }
  }
  return out;
}

// ─── 命令实现 ─────────────────────────────────────────────────────────────────

function cmdGetLastUsed() {
  const reg = readRegistry();

  const lastUsed = reg.lastUsed ? normalizePath(reg.lastUsed) : '';

  if (!lastUsed) {
    process.stderr.write('未记录最近使用的知识库。请先运行 init 并 add，或用 set-last-used 指定路径。\n');
    process.exit(1);
  }

  if (!fs.existsSync(lastUsed)) {
    process.stderr.write(`最近使用的知识库路径不存在：${lastUsed}\n`);
    process.stderr.write('请用 list 查看所有已注册路径，或用 set-last-used 切换。\n');
    process.exit(1);
  }

  process.stdout.write(lastUsed + '\n');
}

function cmdList() {
  const reg = readRegistry();

  const out = {
    lastUsed: reg.lastUsed || '',
    wikis: reg.wikis.map((e) => ({
      path: e.path,
      title: e.title,
      aliases: e.aliases || [],
    })),
  };

  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

function cmdAdd(pathArg, metaArgv) {
  if (!pathArg) {
    usage();
    process.exit(1);
  }
  const { title, aliases, rest } = parseMetaFlags(metaArgv);
  if (rest.length > 0) {
    process.stderr.write('add：未知多余参数\n');
    process.exit(1);
  }

  const normalized = normalizePath(pathArg);
  const reg = readRegistry();

  if (!fs.existsSync(normalized)) {
    process.stderr.write(`路径不存在：${normalized}\n`);
    process.exit(1);
  }

  const hasSchema = fs.existsSync(path.join(normalized, 'wiki-schema.md'));

  const idx = findWikiIndex(reg.wikis, normalized);
  if (idx === -1) {
    const ent = normalizeEntry({
      path: normalized,
      title: title || undefined,
      aliases,
    });
    reg.wikis.push(ent);
  } else {
    const cur = reg.wikis[idx];
    if (title) cur.title = title.trim();
    cur.aliases = mergeAliases(cur.aliases, aliases);
    reg.wikis[idx] = normalizeEntry(cur);
  }

  reg.lastUsed = normalized;
  writeRegistry(reg);

  process.stdout.write(`已注册并记录为最近使用：${normalized}\n`);
  if (!hasSchema) {
    process.stderr.write(`提示：该路径下未找到 wiki-schema.md；将按 llm-wiki 默认行为运行，无本地约定补充。\n`);
  }
}

function cmdSetNames(pathArg, metaArgv) {
  if (!pathArg) {
    usage();
    process.exit(1);
  }
  const { title, aliases, rest } = parseMetaFlags(metaArgv);
  if (rest.length > 0) {
    process.stderr.write('set-names：未知多余参数\n');
    process.exit(1);
  }

  if (!title && (!aliases || aliases.length === 0)) {
    process.stderr.write('set-names：请至少提供 --title 或 --alias\n');
    process.exit(1);
  }

  const normalized = normalizePath(pathArg);
  const reg = readRegistry();
  const idx = findWikiIndex(reg.wikis, normalized);

  if (idx === -1) {
    process.stderr.write(`路径未注册：${normalized}\n`);
    process.stderr.write('请先用 add 注册。\n');
    process.exit(1);
  }

  const cur = reg.wikis[idx];
  if (title) cur.title = title.trim();
  if (aliases && aliases.length) cur.aliases = mergeAliases(cur.aliases, aliases);
  reg.wikis[idx] = normalizeEntry(cur);
  writeRegistry(reg);
  process.stdout.write(`已更新元数据：${normalized}\n`);
}

function cmdSetLastUsed(rawPath) {
  if (!rawPath) {
    usage();
    process.exit(1);
  }
  const normalized = normalizePath(rawPath);
  const reg = readRegistry();

  if (findWikiIndex(reg.wikis, normalized) === -1) {
    process.stderr.write(`路径未注册：${normalized}\n`);
    process.stderr.write('请先用 add 注册，或用 list 查看已注册的知识库。\n');
    process.exit(1);
  }

  if (!fs.existsSync(normalized)) {
    process.stderr.write(`路径不存在：${normalized}\n`);
    process.exit(1);
  }

  reg.lastUsed = normalized;
  writeRegistry(reg);
  process.stdout.write(`已将该路径记录为最近使用：${normalized}\n`);
}

function cmdRemove(rawPath) {
  if (!rawPath) {
    usage();
    process.exit(1);
  }
  const normalized = normalizePath(rawPath);
  const reg = readRegistry();

  const before = reg.wikis.length;
  reg.wikis = reg.wikis.filter((e) => e.path !== normalized);

  if (reg.wikis.length === before) {
    process.stderr.write(`路径未注册，无需移除：${normalized}\n`);
    process.exit(1);
  }

  if (normalizePath(reg.lastUsed || '') === normalized) {
    reg.lastUsed = reg.wikis.length > 0 ? reg.wikis[0].path : '';
    if (reg.lastUsed) {
      process.stderr.write(`已自动将最近使用切换到：${reg.lastUsed}\n`);
    } else {
      process.stderr.write('已移除唯一的知识库，当前未记录最近使用。\n');
    }
  }

  writeRegistry(reg);
  process.stdout.write(`已移除：${normalized}\n`);
}

// ─── CLI 入口 ─────────────────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

switch (command) {
  case 'get-last-used':
    cmdGetLastUsed();
    break;
  case 'list': {
    if (args.length > 0) {
      process.stderr.write('list：不接受额外参数\n');
      usage();
      process.exit(1);
    }
    cmdList();
    break;
  }
  case 'add':
    cmdAdd(args[0], args.slice(1));
    break;
  case 'set-names':
    cmdSetNames(args[0], args.slice(1));
    break;
  case 'set-last-used':
    cmdSetLastUsed(args[0]);
    break;
  case 'remove':
    cmdRemove(args[0]);
    break;
  default:
    usage();
    process.exit(1);
}
