#!/usr/bin/env node
'use strict';

// raw-resource-audit.js — raw 原始素材资源后处理与审计
// 用法：
//   node raw-resource-audit.js <wiki_root> [--fix-links] [--target <raw_path>] [--json]
//
// 功能：
// 1. 将 raw/ 下 Markdown 中的本地文件链接统一规范为 <...> 形式。
// 2. 统计 raw/ 下图片、HTML 快照、PPTX 等资源是否被 Markdown 引用。
// 3. 对未引用资源只报告，不删除；疑似正文图需要人工确认或补到“未挂接图片”区。

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const wikiRoot = args[0] || '.';
const fixLinks = args.includes('--fix-links');
const json = args.includes('--json');
const targetIdx = args.indexOf('--target');
const targetArg = targetIdx >= 0 ? args[targetIdx + 1] : '';

const root = path.resolve(wikiRoot);
const rawRoot = path.join(root, 'raw');
if (!fs.existsSync(rawRoot)) {
  process.stderr.write(`ERROR: raw 目录不存在：${rawRoot}\n`);
  process.exit(1);
}

const LINK_EXTS = ['md', 'html', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'pptx'];
const MEDIA_EXTS = new Set(['.html', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.pptx']);
const linkExtRe = new RegExp(`\\.(${LINK_EXTS.join('|')})(?:[?#][^)]*)?$`, 'i');

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === '.DS_Store') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile()) out.push(p);
  }
  return out;
}

function isExternal(target) {
  return /^(https?:|mailto:|data:|tel:|#)/i.test(target.trim());
}

function hasLinkExt(target) {
  const clean = target.trim().split('#')[0].split('?')[0];
  return linkExtRe.test(clean);
}

function normalizeLinksInFile(file, write) {
  const before = fs.readFileSync(file, 'utf8');
  let changedLinks = 0;
  const after = before.replace(/(!?\[[^\]\n]*\]\()([^)<\n][^\n)]*)(\))/g, (full, open, target, close) => {
    const t = target.trim();
    if (!t || isExternal(t) || !hasLinkExt(t)) return full;
    changedLinks++;
    return `${open}<${t}>${close}`;
  });
  if (write && after !== before) fs.writeFileSync(file, after);
  return changedLinks;
}

function markdownLinks(content) {
  const links = [];
  const angle = /!?\[[^\]\n]*\]\(<([^>]+)>\)/g;
  const plain = /!?\[[^\]\n]*\]\(([^)<\n][^\n)]*)\)/g;
  let m;
  while ((m = angle.exec(content))) links.push(m[1].trim());
  while ((m = plain.exec(content))) links.push(m[1].trim());
  return links;
}

function classifyUnreferenced(file) {
  const ext = path.extname(file).toLowerCase();
  const name = path.basename(file).toLowerCase();
  if (ext === '.html') return 'html_snapshot_or_capture';
  if (ext === '.svg' && /(watch|thumb|share|devote|checked|logo|icon)/i.test(name)) return 'ui_or_social_icon';
  if (/(qrcode|qr|avatar|head|logo|watch|thumb|share|footer|blank|icon)/i.test(name)) return 'likely_noise';
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(name)) return 'needs_review_possible_body_image';
  return 'needs_review';
}

let scanRoot = rawRoot;
if (targetArg) {
  const target = path.resolve(root, targetArg);
  scanRoot = fs.existsSync(target) && fs.statSync(target).isDirectory() ? target : path.dirname(target);
}

const allFiles = walk(scanRoot);
const mdFiles = allFiles.filter(f => f.endsWith('.md'));
const mediaFiles = allFiles.filter(f => MEDIA_EXTS.has(path.extname(f).toLowerCase()));

let changedFiles = 0;
let changedLinks = 0;
for (const f of mdFiles) {
  const n = normalizeLinksInFile(f, fixLinks);
  if (n > 0) {
    changedFiles++;
    changedLinks += n;
  }
}

const referenced = new Map();
for (const f of mdFiles) {
  const dir = path.dirname(f);
  const content = fs.readFileSync(f, 'utf8');
  for (const rawLink of markdownLinks(content)) {
    if (!rawLink || isExternal(rawLink) || !hasLinkExt(rawLink)) continue;
    const clean = rawLink.split('#')[0].split('?')[0];
    const resolved = path.resolve(dir, clean);
    referenced.set(resolved, (referenced.get(resolved) || 0) + 1);
  }
}

const unreferenced = mediaFiles
  .filter(f => !referenced.has(path.resolve(f)))
  .map(f => ({
    path: path.relative(root, f),
    kind: classifyUnreferenced(f),
  }));

const result = {
  scanRoot: path.relative(root, scanRoot) || '.',
  markdownFiles: mdFiles.length,
  resourceFiles: mediaFiles.length,
  referencedResources: mediaFiles.length - unreferenced.length,
  unreferencedResources: unreferenced.length,
  filesWithNonAngleLocalLinks: changedFiles,
  nonAngleLocalLinks: changedLinks,
  fixedFiles: fixLinks ? changedFiles : 0,
  fixedLinks: fixLinks ? changedLinks : 0,
  unreferenced,
};

if (json) {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} else {
  process.stdout.write('=== raw 资源审计报告 ===\n');
  process.stdout.write(`检查范围：${result.scanRoot}\n`);
  process.stdout.write(`Markdown 文件：${result.markdownFiles}\n`);
  process.stdout.write(`资源文件：${result.resourceFiles}\n`);
  process.stdout.write(`已被引用资源：${result.referencedResources}\n`);
  process.stdout.write(`未被引用资源：${result.unreferencedResources}\n`);
  if (fixLinks) {
    process.stdout.write(`规范化链接：${result.fixedLinks} 处，涉及 ${result.fixedFiles} 个文件\n`);
  } else {
    process.stdout.write(`未加尖括号的本地文件链接：${result.nonAngleLocalLinks} 处，涉及 ${result.filesWithNonAngleLocalLinks} 个文件\n`);
  }
  if (unreferenced.length) {
    process.stdout.write('\n--- 未引用资源（不自动删除） ---\n');
    for (const item of unreferenced.slice(0, 200)) {
      process.stdout.write(`  ${item.kind}: ${item.path}\n`);
    }
    if (unreferenced.length > 200) {
      process.stdout.write(`  ... 还有 ${unreferenced.length - 200} 项未显示\n`);
    }
  }
}

process.exit(0);
