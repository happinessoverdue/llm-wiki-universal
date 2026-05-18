#!/usr/bin/env node
'use strict';

// 统一来源总表读取与验证脚本
// 权威数据文件：source-registry.tsv（来源定义）、source-record-contract.tsv（字段契约）

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const CONTRACT_FILE = path.join(SCRIPT_DIR, 'source-record-contract.tsv');
const REGISTRY_FILE = path.join(SCRIPT_DIR, 'source-registry.tsv');

const REGISTRY_HEADER = 'source_id\tsource_label\tsource_category\tinput_mode\tmatch_rule\traw_dir\tadapter_name\tdependency_name\tdependency_type\tfallback_hint';
const CONTRACT_HEADER = 'field_name\trequiredness\tfilled_by\tvalue_rule';

function usage() {
  process.stderr.write(`用法：
  node source-registry.js fields
  node source-registry.js list
  node source-registry.js get <source_id>
  node source-registry.js match-url <url>
  node source-registry.js match-file <path>
  node source-registry.js list-by-category <core_builtin|optional_adapter|manual_only>
  node source-registry.js unique-dependencies <bundled|install_time|none>
  node source-registry.js validate
`);
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    process.stderr.write(`缺少文件：${filePath}\n`);
    process.exit(1);
  }
}

function parseTsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw.split('\n').filter(line => line.trim() !== '');
}

function expectHeader(filePath, expected) {
  const lines = parseTsv(filePath);
  if (lines[0] !== expected) {
    process.stderr.write(`表头不匹配：${filePath}\n期望：${expected}\n实际：${lines[0]}\n`);
    process.exit(1);
  }
}

function validateContract() {
  requireFile(CONTRACT_FILE);
  expectHeader(CONTRACT_FILE, CONTRACT_HEADER);

  const required = new Set([
    'source_id', 'source_label', 'source_category', 'input_mode',
    'raw_dir', 'original_ref', 'ingest_text', 'adapter_name', 'fallback_hint',
  ]);
  const seen = new Map();
  let failed = false;

  const lines = parseTsv(CONTRACT_FILE).slice(1);
  lines.forEach((line, idx) => {
    const cols = line.split('\t');
    if (cols.some(c => c === '')) {
      process.stderr.write(`source-record-contract.tsv 第 ${idx + 2} 行存在空字段\n`);
      failed = true;
    }
    seen.set(cols[0], (seen.get(cols[0]) || 0) + 1);
  });

  for (const field of required) {
    if (seen.get(field) !== 1) {
      process.stderr.write(`source-record-contract.tsv 缺少或重复字段：${field}\n`);
      failed = true;
    }
  }

  if (failed) process.exit(1);
}

function validateRegistry() {
  requireFile(REGISTRY_FILE);
  expectHeader(REGISTRY_FILE, REGISTRY_HEADER);

  const validCategories = new Set(['core_builtin', 'optional_adapter', 'manual_only']);
  const validInputModes = new Set(['url', 'file', 'text', 'asset']);
  const seenIds = new Set();
  const seenCategories = new Set();
  let failed = false;

  const lines = parseTsv(REGISTRY_FILE).slice(1);
  lines.forEach((line, idx) => {
    const rowNum = idx + 2;
    const cols = line.split('\t');
    const [source_id, , source_category, input_mode, match_rule, raw_dir, , , , fallback_hint] = cols;

    if (!source_id || !cols[1] || !source_category || !input_mode || !match_rule || !raw_dir || !fallback_hint) {
      process.stderr.write(`source-registry.tsv 第 ${rowNum} 行存在空字段\n`);
      failed = true;
    }

    if (!validCategories.has(source_category)) {
      process.stderr.write(`source-registry.tsv 第 ${rowNum} 行存在未知分类：${source_category}\n`);
      failed = true;
    }

    if (!validInputModes.has(input_mode)) {
      process.stderr.write(`source-registry.tsv 第 ${rowNum} 行存在未知输入模式：${input_mode}\n`);
      failed = true;
    }

    if (input_mode === 'url' && !match_rule.startsWith('url_host:')) {
      process.stderr.write(`source-registry.tsv 第 ${rowNum} 行 URL 来源必须声明 url_host 规则\n`);
      failed = true;
    }
    if (input_mode === 'file' && !match_rule.startsWith('file_ext:')) {
      process.stderr.write(`source-registry.tsv 第 ${rowNum} 行文件来源必须声明 file_ext 规则\n`);
      failed = true;
    }
    if (input_mode === 'text' && !match_rule.startsWith('text:')) {
      process.stderr.write(`source-registry.tsv 第 ${rowNum} 行文本来源必须声明 text 规则\n`);
      failed = true;
    }
    if (input_mode === 'asset' && !match_rule.startsWith('asset:')) {
      process.stderr.write(`source-registry.tsv 第 ${rowNum} 行附件来源必须声明 asset 规则\n`);
      failed = true;
    }

    if (!raw_dir.startsWith('raw/')) {
      process.stderr.write(`source-registry.tsv 第 ${rowNum} 行 raw_dir 必须位于 raw/ 下\n`);
      failed = true;
    }

    if (seenIds.has(source_id)) {
      process.stderr.write(`source-registry.tsv source_id 重复：${source_id}\n`);
      failed = true;
    }
    seenIds.add(source_id);
    seenCategories.add(source_category);

    const [, , , , , , adapter_name, dependency_name, dependency_type] = cols;
    if (source_category === 'optional_adapter') {
      if (adapter_name === '-' || dependency_name === '-' || dependency_type === 'none') {
        process.stderr.write(`source-registry.tsv 第 ${rowNum} 行 optional_adapter 缺少依赖信息\n`);
        failed = true;
      }
    } else {
      if (adapter_name !== '-' || dependency_name !== '-' || dependency_type !== 'none') {
        process.stderr.write(`source-registry.tsv 第 ${rowNum} 行非外挂来源不应声明依赖\n`);
        failed = true;
      }
    }
  });

  for (const cat of ['core_builtin', 'optional_adapter', 'manual_only']) {
    if (!seenCategories.has(cat)) {
      process.stderr.write(`source-registry.tsv 缺少 ${cat} 来源\n`);
      failed = true;
    }
  }

  if (failed) process.exit(1);
}

function getRegistryRows() {
  validateRegistry();
  return parseTsv(REGISTRY_FILE).slice(1).map(line => line.split('\t'));
}

function printRegistry() {
  validateRegistry();
  process.stdout.write(fs.readFileSync(REGISTRY_FILE, 'utf8'));
}

function printContract() {
  validateContract();
  process.stdout.write(fs.readFileSync(CONTRACT_FILE, 'utf8'));
}

function getSource(sourceId) {
  const row = getRegistryRows().find(cols => cols[0] === sourceId);
  if (!row) {
    process.stderr.write(`未知来源：${sourceId}\n`);
    process.exit(1);
  }
  process.stdout.write(row.join('\t') + '\n');
}

function extractUrlHost(url) {
  let rest = url.replace(/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//, '');
  rest = rest.replace(/^[^@]*@/, '');
  let host = rest.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  return host.toLowerCase();
}

function hostMatchesPattern(host, pattern) {
  return host === pattern || host.endsWith('.' + pattern);
}

function matchUrl(url) {
  const host = extractUrlHost(url);
  let fallbackRow = null;

  for (const cols of getRegistryRows()) {
    const [, , , input_mode, match_rule] = cols;
    if (input_mode !== 'url') continue;

    const patternList = match_rule.replace(/^url_host:/, '');
    if (patternList === '*') {
      fallbackRow = cols;
      continue;
    }

    const patterns = patternList.split(',');
    if (patterns.some(p => hostMatchesPattern(host, p.trim()))) {
      process.stdout.write(cols.join('\t') + '\n');
      return;
    }
  }

  if (fallbackRow) {
    process.stdout.write(fallbackRow.join('\t') + '\n');
    return;
  }

  process.stderr.write(`未匹配到来源：${url}\n`);
  process.exit(1);
}

function matchFile(filePath) {
  const lowered = filePath.toLowerCase();

  for (const cols of getRegistryRows()) {
    const [, , , input_mode, match_rule] = cols;
    if (input_mode !== 'file') continue;

    const extList = match_rule.replace(/^file_ext:/, '').split(',');
    if (extList.some(ext => lowered.endsWith(ext.trim()))) {
      process.stdout.write(cols.join('\t') + '\n');
      return;
    }
  }

  process.stderr.write(`未匹配到文件来源：${filePath}\n`);
  process.exit(1);
}

function listByCategory(category) {
  getRegistryRows()
    .filter(cols => cols[2] === category)
    .forEach(cols => process.stdout.write(cols.join('\t') + '\n'));
}

function listUniqueDependencies(dependencyType) {
  const seen = new Set();
  getRegistryRows()
    .filter(cols => cols[8] === dependencyType && cols[7] !== '-')
    .forEach(cols => seen.add(cols[7]));
  for (const dep of [...seen].sort()) {
    process.stdout.write(dep + '\n');
  }
}

// ─── CLI 入口 ───────────────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

switch (command) {
  case 'fields':
    if (args.length !== 0) { usage(); process.exit(1); }
    printContract();
    break;
  case 'list':
    if (args.length !== 0) { usage(); process.exit(1); }
    printRegistry();
    break;
  case 'get':
    if (args.length !== 1) { usage(); process.exit(1); }
    getSource(args[0]);
    break;
  case 'match-url':
    if (args.length !== 1) { usage(); process.exit(1); }
    matchUrl(args[0]);
    break;
  case 'match-file':
    if (args.length !== 1) { usage(); process.exit(1); }
    matchFile(args[0]);
    break;
  case 'list-by-category':
    if (args.length !== 1) { usage(); process.exit(1); }
    listByCategory(args[0]);
    break;
  case 'unique-dependencies':
    if (args.length !== 1) { usage(); process.exit(1); }
    listUniqueDependencies(args[0]);
    break;
  case 'validate':
    if (args.length !== 0) { usage(); process.exit(1); }
    validateContract();
    validateRegistry();
    break;
  default:
    usage();
    process.exit(1);
}
