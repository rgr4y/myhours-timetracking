#!/usr/bin/env node
const { spawnSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const { join } = require('path');

function loadDotEnvIntoProcess(dotenvPath) {
  if (!existsSync(dotenvPath)) return;
  const text = readFileSync(dotenvPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let [, key, val] = m;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}

(function main() {
  // Load .env (optional) so we can read BUILD_ARM64 flag
  loadDotEnvIntoProcess(join(process.cwd(), '.env'));

  const enableArm = /^(1|true|yes|on)$/i.test(String(process.env.BUILD_ARM64 || ''));

  // Build args: override mac arch to x64 by default, add arm64 only if flagged
  const args = [];
  // Let config decide targets; we only restrict arch for mac
  args.push('--mac');
  args.push('--x64');
  if (enableArm) args.push('--arm64');

  // Keep Windows build as configured (x64). Include platform flag for clarity
  args.push('--win');

  // Use local electron-builder binary
  const bin = join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder');
  run(bin, args);
})();

