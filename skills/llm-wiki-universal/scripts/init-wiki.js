#!/usr/bin/env node
'use strict';

// llm-wiki 初始化脚本
// 用法：node init-wiki.js <知识库路径> <主题> [语言] [--force]
//
// 退出码：
//   0  成功
//   2  目标路径已存在且非空（未传 --force）—— 让调用方（AI）提示用户确认后再加 --force 重试
//   1  其他错误

const fs = require('fs');
const path = require('path');

// 默认路径：当前工作目录下以主题命名的子文件夹（不依赖 ~/Documents 是否存在）
const defaultWikiRoot = path.join(process.cwd(), '我的知识库');

const wikiRoot = process.argv[2] ? path.resolve(process.argv[2]) : defaultWikiRoot;
const topic = process.argv[3] || '我的知识库';
const languageArg = process.argv[4] || '中文';
const isEnglish = /^(en|english)$/i.test(languageArg);
const language = isEnglish ? 'English' : '中文';
const force = process.argv.includes('--force');
const date = new Date().toISOString().slice(0, 10);
const skillDir = path.resolve(__dirname, '..');

// 检测目标目录是否已存在且非空
if (fs.existsSync(wikiRoot)) {
  const entries = fs.readdirSync(wikiRoot).filter(f => !f.startsWith('.'));
  if (entries.length > 0 && !force) {
    process.stderr.write(
      `[NON_EMPTY] 目标目录已存在且非空：${wikiRoot}\n` +
      `已有文件：${entries.slice(0, 5).join(', ')}${entries.length > 5 ? ` 等共 ${entries.length} 项` : ''}\n` +
      `若确认继续，请加 --force 参数重新运行。\n`
    );
    process.exit(2);
  }
}

function replaceVars(content) {
  return content
    .replace(/\{\{TOPIC\}\}/g, topic)
    .replace(/\{\{DATE\}\}/g, date)
    .replace(/\{\{WIKI_ROOT\}\}/g, wikiRoot)
    .replace(/\{\{LANGUAGE\}\}/g, language);
}

function fromTemplate(name) {
  const tpl = path.join(skillDir, 'templates', name);
  if (!fs.existsSync(tpl)) {
    process.stderr.write(`模板文件缺失：${tpl}\n`);
    process.exit(1);
  }
  return replaceVars(fs.readFileSync(tpl, 'utf8'));
}

function localizedTemplate(base) {
  const enName = `${base}-en-template.md`;
  const zhName = `${base}-template.md`;
  const enPath = path.join(skillDir, 'templates', enName);
  return isEnglish && fs.existsSync(enPath) ? enName : zhName;
}

console.log('正在创建知识库...');
console.log(`   路径：${wikiRoot}`);
console.log(`   主题：${topic}`);
console.log(`   语言：${language}`);
console.log('');

// 创建目录结构
const dirs = [
  'raw/articles', 'raw/tweets', 'raw/wechat',
  'raw/xiaohongshu', 'raw/zhihu', 'raw/pdfs',
  'raw/notes', 'raw/assets',
  'wiki/entities', 'wiki/topics', 'wiki/sources',
  'wiki/comparisons', 'wiki/synthesis', 'wiki/synthesis/sessions', 'wiki/queries',
];
for (const dir of dirs) {
  fs.mkdirSync(path.join(wikiRoot, dir), { recursive: true });
}
fs.writeFileSync(path.join(wikiRoot, '.gitignore'), '.wiki-tmp/\n');
console.log('[完成] 目录结构已创建');

// 从模板生成文件
fs.writeFileSync(path.join(wikiRoot, 'wiki-schema.md'), fromTemplate(localizedTemplate('schema')));
console.log('[完成] 本地约定文件已生成');

fs.writeFileSync(path.join(wikiRoot, 'index.md'), fromTemplate(localizedTemplate('index')));
console.log('[完成] 索引文件已生成');

fs.writeFileSync(path.join(wikiRoot, 'log.md'), fromTemplate(localizedTemplate('log')));
console.log('[完成] 日志文件已生成');

fs.writeFileSync(path.join(wikiRoot, 'wiki', 'overview.md'), fromTemplate(localizedTemplate('overview')));
console.log('[完成] 总览文件已生成');

fs.writeFileSync(path.join(wikiRoot, 'purpose.md'), fromTemplate(localizedTemplate('purpose')));
console.log('[完成] 用户语境文件已生成');

fs.writeFileSync(
  path.join(wikiRoot, '.wiki-cache.json'),
  JSON.stringify({ version: 1, entries: {} }, null, 2) + '\n'
);
console.log('[完成] 缓存文件已生成');

console.log('');
console.log('知识库创建完成！');
console.log('');
console.log('目录结构：');
console.log(`   ${wikiRoot}/`);
console.log('   ├── raw/        （原始素材）');
console.log('   │   ├── articles/     网页文章');
console.log('   │   ├── tweets/       X/Twitter');
console.log('   │   ├── wechat/       微信公众号');
console.log('   │   ├── xiaohongshu/  小红书');
console.log('   │   ├── zhihu/        知乎');
console.log('   │   ├── pdfs/         PDF');
console.log('   │   ├── notes/        笔记');
console.log('   │   └── assets/       图片等附件');
console.log('   ├── wiki/       （知识库）');
console.log('   ├── index.md    （索引）');
console.log('   ├── log.md      （日志）');
console.log('   ├── purpose.md  （用户语境）');
console.log('   ├── .wiki-cache.json （缓存）');
console.log('   └── wiki-schema.md （本地约定）');
console.log('');
console.log('下一步：给 agent 一个链接或文件，开始构建知识库！');
