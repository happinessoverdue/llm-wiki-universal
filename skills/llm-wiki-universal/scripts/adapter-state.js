#!/usr/bin/env node
'use strict';

// 外挂状态检测脚本：统一判断可选外挂的安装/环境/运行状态
// 五种状态：not_installed / env_unavailable / runtime_failed / unsupported / empty_result
// 跨平台实现：不依赖 lsof / bash / which；使用 Node.js 内置 API

const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawnSync } = require('child_process');
const { WECHAT_TOOL_URL } = require('./shared-config.js');
const { resolveOptionalAdapterRoot } = require('./runtime-context.js');

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const SOURCE_REGISTRY_SCRIPT = path.join(SCRIPT_DIR, 'source-registry.js');

function usage() {
  process.stderr.write(`用法：
  node adapter-state.js [--skill-root <path>] [--layout-mode <mode>] check <source_id>
  node adapter-state.js [--skill-root <path>] [--layout-mode <mode>] summary
  node adapter-state.js [--skill-root <path>] [--layout-mode <mode>] summary-human
  node adapter-state.js [--skill-root <path>] [--layout-mode <mode>] classify-run <source_id> <exit_code> <output_path>
`);
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────

function commandExists(cmd) {
  // 跨平台：Windows 用 where，其他用 which
  const isWin = process.platform === 'win32';
  const result = spawnSync(isWin ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return result.status === 0;
}

function hasUv() {
  return commandExists('uv');
}

// 同步检测 Chrome 调试端口 9222 是否在监听
// 跨平台：用 TCP 连接尝试，超时 500ms
function chromeDebugReady() {
  return new Promise(resolve => {
    const socket = net.createConnection(9222, '127.0.0.1');
    const timer = setTimeout(() => { socket.destroy(); resolve(false); }, 500);
    socket.on('connect', () => { clearTimeout(timer); socket.destroy(); resolve(true); });
    socket.on('error', () => { clearTimeout(timer); resolve(false); });
  });
}

// 同步包装：通过子进程运行内联 node 脚本检测端口
function chromeDebugReadySync() {
  const code = `
const net = require('net');
const s = net.createConnection(9222, '127.0.0.1');
const t = setTimeout(() => { s.destroy(); process.exit(1); }, 500);
s.on('connect', () => { clearTimeout(t); s.destroy(); process.exit(0); });
s.on('error', () => { clearTimeout(t); process.exit(1); });
`;
  const result = spawnSync(process.execPath, ['-e', code], { timeout: 1000 });
  return result.status === 0;
}

function dependencyInstalled(dependencyName, dependencyType, skillRootOverride, layoutModeOverride) {
  switch (dependencyType) {
    case 'bundled': {
      const optionalRoot = resolveOptionalAdapterRoot(PROJECT_ROOT, skillRootOverride, layoutModeOverride);
      return fs.existsSync(path.join(optionalRoot, dependencyName));
    }
    case 'install_time':
      return commandExists(dependencyName);
    case 'none':
      return true;
    default:
      return false;
  }
}

// ─── 来源总表读取 ─────────────────────────────────────────────────────────

function runSourceRegistry(args) {
  const result = spawnSync(process.execPath, [SOURCE_REGISTRY_SCRIPT, ...args], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || '');
    return null;
  }
  return result.stdout.trim();
}

function getSourceRow(sourceId) {
  const output = runSourceRegistry(['get', sourceId]);
  if (!output) {
    process.stderr.write(`未知来源：${sourceId}\n`);
    process.exit(1);
  }
  const cols = output.split('\t');
  return {
    source_id: cols[0],
    source_label: cols[1],
    source_category: cols[2],
    input_mode: cols[3],
    match_rule: cols[4],
    raw_dir: cols[5],
    adapter_name: cols[6],
    dependency_name: cols[7],
    dependency_type: cols[8],
    fallback_hint: cols[9],
  };
}

function getOptionalAdapterRows() {
  const output = runSourceRegistry(['list']);
  if (!output) return [];
  return output.split('\n')
    .slice(1)
    .filter(l => l.trim())
    .map(l => l.split('\t'))
    .filter(cols => cols[2] === 'optional_adapter' || cols[2] === 'manual_only');
}

// ─── 状态标签 ─────────────────────────────────────────────────────────────

function stateLabel(state) {
  const labels = {
    available: '可用',
    not_installed: '未安装',
    env_unavailable: '环境不满足',
    runtime_failed: '运行失败',
    unsupported: '不支持自动提取',
    empty_result: '结果为空',
  };
  return labels[state] || state;
}

function emitRow(source_id, source_label, state, detail, recovery_action, install_hint, fallback_hint) {
  const cols = [source_id, source_label, state, stateLabel(state), detail, recovery_action, install_hint, fallback_hint];
  process.stdout.write(cols.join('\t') + '\n');
}

function printHeader() {
  process.stdout.write('source_id\tsource_label\tstate\tstate_label\tdetail\trecovery_action\tinstall_hint\tfallback_hint\n');
}

// ─── 安装/环境提示 ────────────────────────────────────────────────────────

function defaultInstallHint(sourceId, adapterName) {
  switch (sourceId) {
    case 'web_article':
    case 'x_twitter':
    case 'zhihu_article':
      return `重新运行 llm-wiki 安装命令并追加 --with-optional-adapters，确认 ${adapterName} 已准备到技能目录`;
    case 'wechat_article':
      return `先安装 uv，再执行：uv tool install ${WECHAT_TOOL_URL}`;
    case 'youtube_video':
      return `重新运行 llm-wiki 安装命令并追加 --with-optional-adapters，确认 ${adapterName} 已准备到技能目录`;
    default:
      return '-';
  }
}

function envInstallHint(sourceId) {
  switch (sourceId) {
    case 'web_article':
    case 'x_twitter':
    case 'zhihu_article':
      return 'macOS: open -na "Google Chrome" --args --remote-debugging-port=9222 | Windows: chrome.exe --remote-debugging-port=9222 | Linux: google-chrome --remote-debugging-port=9222';
    case 'wechat_article':
    case 'youtube_video':
      return 'macOS/Linux: brew install uv 或 curl -LsSf https://astral.sh/uv/install.sh | sh | Windows: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"';
    default:
      return '-';
  }
}

// ─── 核心状态解析 ─────────────────────────────────────────────────────────

function resolvePreflight(sourceId, skillRootOverride, layoutModeOverride) {
  const src = getSourceRow(sourceId);

  switch (src.source_category) {
    case 'core_builtin':
      return { state: 'available', detail: '核心主线可直接进入，不依赖外挂', recovery_action: '直接继续主线', install_hint: '-', fallback_hint: src.fallback_hint, ...src };

    case 'manual_only':
      return { state: 'unsupported', detail: '该来源当前只支持手动进入主线', recovery_action: '直接走手动入口', install_hint: '-', fallback_hint: src.fallback_hint, ...src };

    case 'optional_adapter': {
      const dep = src.dependency_name;
      const depType = src.dependency_type;

      switch (sourceId) {
        case 'wechat_article': {
          if (!hasUv()) {
            return { state: 'env_unavailable', detail: '缺少 uv，当前无法准备微信公众号自动提取环境', recovery_action: '先补环境；现在也可以直接走手动入口', install_hint: envInstallHint(sourceId), fallback_hint: src.fallback_hint, ...src };
          }
          if (!dependencyInstalled(dep, depType, skillRootOverride, layoutModeOverride)) {
            return { state: 'not_installed', detail: `未找到 ${src.adapter_name}`, recovery_action: '先补安装；现在也可以直接走手动入口', install_hint: defaultInstallHint(sourceId, src.adapter_name), fallback_hint: src.fallback_hint, ...src };
          }
          return { state: 'available', detail: `${src.adapter_name} 已可用`, recovery_action: '继续自动提取', install_hint: '-', fallback_hint: src.fallback_hint, ...src };
        }

        case 'web_article':
        case 'x_twitter':
        case 'zhihu_article': {
          if (!dependencyInstalled(dep, depType, skillRootOverride, layoutModeOverride)) {
            return { state: 'not_installed', detail: `未找到 ${src.adapter_name}`, recovery_action: '先补安装；现在也可以直接走手动入口', install_hint: defaultInstallHint(sourceId, src.adapter_name), fallback_hint: src.fallback_hint, ...src };
          }
          if (!chromeDebugReadySync()) {
            return { state: 'env_unavailable', detail: 'Chrome 调试端口 9222 未监听', recovery_action: '先补环境；现在也可以直接走手动入口', install_hint: envInstallHint(sourceId), fallback_hint: src.fallback_hint, ...src };
          }
          return { state: 'available', detail: `${src.adapter_name} 已可用`, recovery_action: '继续自动提取', install_hint: '-', fallback_hint: src.fallback_hint, ...src };
        }

        case 'youtube_video': {
          if (!dependencyInstalled(dep, depType, skillRootOverride, layoutModeOverride)) {
            return { state: 'not_installed', detail: `未找到 ${src.adapter_name}`, recovery_action: '先补安装；现在也可以直接走手动入口', install_hint: defaultInstallHint(sourceId, src.adapter_name), fallback_hint: src.fallback_hint, ...src };
          }
          if (!hasUv()) {
            return { state: 'env_unavailable', detail: '缺少 uv，当前无法运行 YouTube 字幕提取', recovery_action: '先补环境；现在也可以直接走手动入口', install_hint: envInstallHint(sourceId), fallback_hint: src.fallback_hint, ...src };
          }
          return { state: 'available', detail: `${src.adapter_name} 已可用`, recovery_action: '继续自动提取', install_hint: '-', fallback_hint: src.fallback_hint, ...src };
        }

        default: {
          if (!dependencyInstalled(dep, depType, skillRootOverride, layoutModeOverride)) {
            return { state: 'not_installed', detail: `未找到 ${src.adapter_name}`, recovery_action: '先补安装；现在也可以直接走手动入口', install_hint: defaultInstallHint(sourceId, src.adapter_name), fallback_hint: src.fallback_hint, ...src };
          }
          return { state: 'available', detail: `${src.adapter_name} 已可用`, recovery_action: '继续自动提取', install_hint: '-', fallback_hint: src.fallback_hint, ...src };
        }
      }
    }

    default:
      process.stderr.write(`未知来源分类：${src.source_category}\n`);
      process.exit(1);
  }
}

function emitPreflight(sourceId, skillRootOverride, layoutModeOverride) {
  const r = resolvePreflight(sourceId, skillRootOverride, layoutModeOverride);
  emitRow(r.source_id, r.source_label, r.state, r.detail, r.recovery_action, r.install_hint, r.fallback_hint);
}

// ─── classify-run ─────────────────────────────────────────────────────────

function classifyRun(sourceId, exitCode, outputPath, skillRootOverride, layoutModeOverride) {
  const exitNum = parseInt(exitCode, 10);
  if (isNaN(exitNum)) {
    process.stderr.write(`exit_code 必须是整数，收到：${exitCode}\n`);
    process.exit(1);
  }

  const r = resolvePreflight(sourceId, skillRootOverride, layoutModeOverride);

  if (r.state !== 'available') {
    emitRow(r.source_id, r.source_label, r.state, r.detail, r.recovery_action, r.install_hint, r.fallback_hint);
    return;
  }

  if (exitNum !== 0) {
    emitRow(r.source_id, r.source_label, 'runtime_failed', '自动提取执行失败', '可以先重试一次；如果还不行，就改走手动入口', '-', r.fallback_hint);
    return;
  }

  const hasContent = fs.existsSync(outputPath) && fs.readFileSync(outputPath, 'utf8').trim().length > 0;
  if (!hasContent) {
    emitRow(r.source_id, r.source_label, 'empty_result', '自动提取完成，但没有拿到有效正文', '请手动补全文本后继续主线', '-', r.fallback_hint);
    return;
  }

  emitRow(r.source_id, r.source_label, 'available', '自动提取已拿到有效正文', '继续进入主线', '-', r.fallback_hint);
}

// ─── summary / summary-human ──────────────────────────────────────────────

function printSummary(skillRootOverride, layoutModeOverride) {
  printHeader();
  for (const cols of getOptionalAdapterRows()) {
    emitPreflight(cols[0], skillRootOverride, layoutModeOverride);
  }
}

function printSummaryHuman(skillRootOverride, layoutModeOverride) {
  for (const cols of getOptionalAdapterRows()) {
    const r = resolvePreflight(cols[0], skillRootOverride, layoutModeOverride);
    process.stdout.write(`- ${r.source_label}：${stateLabel(r.state)}。${r.detail}。\n`);
    process.stdout.write(`  下一步：${r.recovery_action}。\n`);
    if (r.install_hint !== '-') {
      process.stdout.write(`  安装提示：${r.install_hint}。\n`);
    }
    process.stdout.write(`  回退方式：${r.fallback_hint}。\n`);
  }
}

// ─── CLI 入口 ───────────────────────────────────────────────────────────────

let skillRootOverride = '';
let layoutModeOverride = '';
const argv = process.argv.slice(2);

while (argv.length > 0 && argv[0].startsWith('--')) {
  if (argv[0] === '--skill-root' && argv.length >= 2) {
    skillRootOverride = argv[1];
    argv.splice(0, 2);
  } else if (argv[0] === '--layout-mode' && argv.length >= 2) {
    layoutModeOverride = argv[1];
    argv.splice(0, 2);
  } else {
    break;
  }
}

const [command, ...args] = argv;

switch (command) {
  case 'check':
    if (args.length !== 1) { usage(); process.exit(1); }
    printHeader();
    emitPreflight(args[0], skillRootOverride, layoutModeOverride);
    break;
  case 'summary':
    if (args.length !== 0) { usage(); process.exit(1); }
    printSummary(skillRootOverride, layoutModeOverride);
    break;
  case 'summary-human':
    if (args.length !== 0) { usage(); process.exit(1); }
    printSummaryHuman(skillRootOverride, layoutModeOverride);
    break;
  case 'classify-run':
    if (args.length !== 3) { usage(); process.exit(1); }
    printHeader();
    classifyRun(args[0], args[1], args[2], skillRootOverride, layoutModeOverride);
    break;
  default:
    usage();
    process.exit(1);
}
