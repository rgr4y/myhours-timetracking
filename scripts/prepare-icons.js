#!/usr/bin/env node
const { execFileSync, spawnSync } = require('child_process');
const { existsSync, mkdirSync, renameSync } = require('fs');
const { join } = require('path');

function log(msg) {
  // Keep logs concise for CI output
  console.log(`[icons] ${msg}`);
}

function generateIcnsFromPng(pngPath) {
  const script = join(__dirname, 'generate-mac-icns.sh');
  try {
    execFileSync(script, [pngPath], { stdio: 'inherit' });
    return true;
  } catch (e) {
    log(`Failed running ${script}: ${e.message}`);
    return false;
  }
}

function qlThumbSvgToPng(svgPath, outDir) {
  // Uses QuickLook to render a 1024px PNG thumbnail of the SVG
  const ql = spawnSync(
    'qlmanage',
    ['-t', '-s', '1024', '-o', outDir, svgPath],
    { stdio: 'inherit' },
  );
  if (ql.status !== 0) return null;
  const produced = join(outDir, `${svgPath.split('/').pop()}.png`);
  return existsSync(produced) ? produced : null;
}

(function main() {
  if (process.platform !== 'darwin') {
    // Only generate mac icons on macOS
    return;
  }

  const buildDir = join(process.cwd(), 'build');
  const icnsPath = join(buildDir, 'icon.icns');
  const svgPath = join(process.cwd(), 'assets', 'icon.svg');
  const pngFallback1024 = join(process.cwd(), 'assets', 'icon-1024.png');
  const pngFallbackGeneric = join(process.cwd(), 'assets', 'icon.png');

  if (existsSync(icnsPath)) {
    log('Existing build/icon.icns found; skipping generation.');
    return;
  }

  mkdirSync(buildDir, { recursive: true });

  // 1) Prefer a pre-rendered PNG if present (icon-1024.png or icon.png)
  if (existsSync(pngFallback1024)) {
    log('Found assets/icon-1024.png; generating ICNS...');
    generateIcnsFromPng(pngFallback1024);
    return;
  }
  if (existsSync(pngFallbackGeneric)) {
    log('Found assets/icon.png; generating ICNS...');
    generateIcnsFromPng(pngFallbackGeneric);
    return;
  }

  // 2) Try to rasterize SVG via QuickLook
  if (existsSync(svgPath)) {
    log('Rasterizing SVG via QuickLook to 1024 PNG...');
    const produced = qlThumbSvgToPng(svgPath, buildDir);
    if (produced && existsSync(produced)) {
      const targetPng = join(buildDir, 'icon-1024.png');
      try {
        renameSync(produced, targetPng);
      } catch (_) {}
      log('Generating ICNS from QuickLook PNG...');
      generateIcnsFromPng(targetPng);
      return;
    }
  }

  log(
    'Warning: Could not generate macOS icon. Provide assets/icon-1024.png or run scripts/generate-mac-icns.sh manually.',
  );
})();
