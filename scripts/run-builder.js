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
  // Load .env (optional) so we can read flags
  loadDotEnvIntoProcess(join(process.cwd(), '.env'));

  const truthy = (v) => /^(1|true|yes|on)$/i.test(String(v || ''));
  const enableArm = truthy(process.env.BUILD_ARM64);
  const buildMac = process.platform === 'darwin' || truthy(process.env.BUILD_MAC);
  const buildWin = process.platform === 'win32' || truthy(process.env.BUILD_WIN);
  const buildLinux = process.platform === 'linux' || truthy(process.env.BUILD_LINUX);

  // Build args per platform. By default, only build for the current OS.
  const args = [];
  if (buildMac) {
    const macTarget = (process.env.MAC_TARGET || 'dir') // default: only .app bundle
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .join(',');
    args.push('--mac');
    args.push(macTarget); // e.g., 'dir' or 'dmg' or 'dir,dmg'
    args.push('--x64');
    if (enableArm) args.push('--arm64');
  }
  if (buildWin) {
    args.push('--win');
    args.push('--x64');
  }
  if (buildLinux) {
    args.push('--linux');
    args.push('--x64');
  }

  // Use local electron-builder binary
  const bin = join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder');
  run(bin, args);
})();
