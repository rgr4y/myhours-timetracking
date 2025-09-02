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
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function run(cmd, args) {
  console.log('Executing:', cmd, args.join(' '));

  let spawnCmd = cmd;
  let spawnArgs = args;

  // On Windows, we need to run .cmd files through cmd.exe
  if (process.platform === 'win32' && cmd.endsWith('.cmd')) {
    spawnCmd = 'cmd.exe';
    spawnArgs = ['/c', cmd, ...args];
    console.log('Windows detected, using cmd.exe wrapper');
    console.log('Final command:', spawnCmd, spawnArgs.join(' '));
  }

  const r = spawnSync(spawnCmd, spawnArgs, { stdio: 'inherit' });
  console.log('Exit code:', r.status);
  if (r.error) {
    console.error('Error executing command:', r.error);
  }
  if (r.status !== 0) process.exit(r.status || 1);
}

(function main() {
  try {
    console.log('Starting run-builder.js...');
    console.log('Current working directory:', process.cwd());
    console.log('Platform:', process.platform);

    // Load .env (optional) so we can read flags
    const envPath = join(process.cwd(), '.env');
    console.log('Looking for .env at:', envPath);
    loadDotEnvIntoProcess(envPath);

    const truthy = (v) => /^(1|true|yes|on)$/i.test(String(v || ''));
    const enableArm = truthy(process.env.BUILD_ARM64);
    const buildMac =
      process.platform === 'darwin' || truthy(process.env.BUILD_MAC);
    const buildWin =
      process.platform === 'win32' || truthy(process.env.BUILD_WIN);
    const buildLinux =
      process.platform === 'linux' || truthy(process.env.BUILD_LINUX);

    // Build args per platform. By default, only build for the current OS.
    const args = [];

    if (buildMac) {
      const macTarget = process.env.MAC_TARGET || 'dir'; // default: only .app bundle
      const targets = macTarget
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      args.push('--mac');
      for (const target of targets) {
        args.push(target);
      }
    }
    if (buildWin) {
      const winTarget = process.env.WIN_TARGET || 'dir'; // default: only unpacked folder
      const targets = winTarget
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      args.push('--win');
      for (const target of targets) {
        args.push(target);
      }
    }
    if (buildLinux) {
      const linuxTarget = process.env.LINUX_TARGET || 'dir'; // default: only unpacked folder
      const targets = linuxTarget
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      args.push('--linux');
      for (const target of targets) {
        args.push(target);
      }
    }

    // Add architecture flags once at the end
    args.push('--x64');
    if (enableArm && buildMac) args.push('--arm64'); // Only add ARM64 for macOS

    // Pass through any additional arguments (like --publish=always)
    const additionalArgs = process.argv.slice(2);
    args.push(...additionalArgs);

    // Use local electron-builder binary
    const bin = join(
      process.cwd(),
      'node_modules',
      '.bin',
      process.platform === 'win32'
        ? 'electron-builder.cmd'
        : 'electron-builder',
    );
    console.log('Electron-builder binary path:', bin);
    console.log('Binary exists:', existsSync(bin));

    run(bin, args);
  } catch (error) {
    console.error('Fatal error in run-builder.js:', error);
    process.exit(1);
  }
})();
