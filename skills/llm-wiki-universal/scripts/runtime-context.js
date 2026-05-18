'use strict';

// 共享运行场景解析：供 adapter-state.js 复用

const path = require('path');
const os = require('os');
const fs = require('fs');

function resolvePlatformSkillRoot(platform) {
  switch (platform) {
    case 'claude':
      return path.join(os.homedir(), '.claude', 'skills');
    case 'codex': {
      const lower = path.join(os.homedir(), '.codex', 'skills');
      const upper = path.join(os.homedir(), '.Codex', 'skills');
      // 优先 .codex，除非只有 .Codex 存在
      if (fs.existsSync(lower) || !fs.existsSync(upper)) return lower;
      return upper;
    }
    case 'openclaw':
      return path.join(os.homedir(), '.openclaw', 'skills');
    default:
      throw new Error(`不支持的平台：${platform}`);
  }
}

function detectLayoutMode(bundleRoot) {
  return fs.existsSync(path.join(bundleRoot, '.git')) ? 'source_checkout' : 'installed_skill';
}

function resolveLayoutMode(bundleRoot, overrideMode) {
  if (overrideMode) return overrideMode;
  return detectLayoutMode(bundleRoot);
}

function resolveOptionalAdapterRoot(bundleRoot, skillRootOverride, overrideMode) {
  if (skillRootOverride) return skillRootOverride;
  const layoutMode = resolveLayoutMode(bundleRoot, overrideMode);
  switch (layoutMode) {
    case 'source_checkout':
      return path.join(bundleRoot, 'deps');
    case 'installed_skill':
    case 'upgrade_target':
      return path.dirname(bundleRoot);
    default:
      throw new Error(`未知运行模式：${layoutMode}`);
  }
}

module.exports = {
  resolvePlatformSkillRoot,
  detectLayoutMode,
  resolveLayoutMode,
  resolveOptionalAdapterRoot,
};
