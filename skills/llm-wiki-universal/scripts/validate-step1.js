#!/usr/bin/env node
'use strict';

// 验证 ingest Step 1 的 JSON 输出格式
// 用法：node validate-step1.js <json_file>
// 返回：0 = 格式正确，1 = 格式有问题（触发回退）

const fs = require('fs');

const jsonFile = process.argv[2];

if (!jsonFile) {
  process.stderr.write('ERROR: usage: node validate-step1.js <json_file>\n');
  process.exit(1);
}

if (!fs.existsSync(jsonFile)) {
  process.stderr.write(`ERROR: file not found: ${jsonFile}\n`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
} catch (e) {
  process.stderr.write(`ERROR: invalid JSON format: ${e.message}\n`);
  process.exit(1);
}

const VALID_CONFIDENCE = new Set(['EXTRACTED', 'INFERRED', 'AMBIGUOUS', 'UNVERIFIED']);

const checks = [
  [Array.isArray(data.entities), "'entities' must be an array"],
  [Array.isArray(data.topics), "'topics' must be an array"],
  [Array.isArray(data.connections), "'connections' must be an array"],
  [Array.isArray(data.contradictions), "'contradictions' must be an array"],
  [data.new_vs_existing !== null && typeof data.new_vs_existing === 'object' && !Array.isArray(data.new_vs_existing), "'new_vs_existing' must be an object"],
];

for (const [ok, msg] of checks) {
  if (!ok) {
    process.stderr.write(`ERROR: ${msg}\n`);
    process.exit(1);
  }
}

const invalidConfidence = (data.entities || [])
  .map(e => e.confidence || 'MISSING')
  .filter(c => !VALID_CONFIDENCE.has(c));

if (invalidConfidence.length > 0) {
  process.stderr.write(`ERROR: invalid confidence value(s): ${invalidConfidence.slice(0, 3).join(', ')}\n`);
  process.stderr.write('       Valid values: EXTRACTED | INFERRED | AMBIGUOUS | UNVERIFIED\n');
  process.exit(1);
}

process.stdout.write('OK: Step 1 JSON validation passed\n');
process.exit(0);
