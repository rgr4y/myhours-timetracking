#!/usr/bin/env node
import { execFileSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, renameSync } from 'fs';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(msg) {
  // Keep logs concise for CI output
  console.log(`[icons] ${msg}`);
}

function generatePngFromSvg(svgPath, outputPath, size = 1024) {
  try {
    // Try rsvg-convert first (best quality)
    execFileSync(
      'rsvg-convert',
      ['-w', size.toString(), '-h', size.toString(), '-o', outputPath, svgPath],
      { stdio: 'inherit' },
    );
    log(`Generated ${outputPath} from SVG using rsvg-convert`);
    return true;
  } catch (e) {
    log(`rsvg-convert failed: ${e.message}`);

    // Fallback to ImageMagick with proper flags for color preservation
    try {
      execFileSync(
        'convert',
        [
          '-background',
          'none',
          '-density',
          '300',
          svgPath,
          '-resize',
          `${size}x${size}`,
          outputPath,
        ],
        { stdio: 'inherit' },
      );
      log(`Generated ${outputPath} from SVG using ImageMagick convert`);
      return true;
    } catch (e2) {
      log(`ImageMagick convert also failed: ${e2.message}`);
      return false;
    }
  }
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

  // Always regenerate icon.icns to pick up any changes to source assets
  log('Generating macOS icon.icns from source assets...');

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

  // 2) Generate PNG from SVG if SVG exists
  if (existsSync(svgPath)) {
    log('No PNG found, generating PNG from SVG...');
    const generatedPng = join(process.cwd(), 'assets', 'icon.png');
    if (generatePngFromSvg(svgPath, generatedPng, 1024)) {
      log('Generated PNG from SVG; generating ICNS...');
      generateIcnsFromPng(generatedPng);
      return;
    }
  }

  // 3) Fallback: Try to rasterize SVG via QuickLook
  if (existsSync(svgPath)) {
    log('Fallback: Rasterizing SVG via QuickLook to 1024 PNG...');
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
