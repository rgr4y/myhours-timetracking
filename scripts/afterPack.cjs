const path = require('path');
const fs = require('fs');
const { Arch } = require('electron-builder');

// Map electron-builder arch codes to Prisma engine filename patterns
const PRISMA_ENGINE_ARCH = {
  [Arch.x64]: 'darwin',
  [Arch.arm64]: 'darwin-arm64',
};

// electron-builder refuses to pack dot-directories (.prisma).
// This hook copies node_modules/.prisma into the unpacked output after packing,
// filtering out engine binaries that don't match the target architecture.
exports.default = async function afterPack(context) {
  const src = path.join(context.packager.projectDir, 'node_modules', '.prisma');
  const dest = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
    'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', '.prisma'
  );

  if (!fs.existsSync(src)) {
    console.warn('[afterPack] node_modules/.prisma not found — skipping');
    return;
  }

  const targetArch = context.arch;
  const keepSuffix = PRISMA_ENGINE_ARCH[targetArch];
  console.log(`[afterPack] Target arch: ${targetArch} → keeping Prisma engine: ${keepSuffix || 'all (unknown arch)'}`);

  copyDirSync(src, dest, keepSuffix);
  console.log(`[afterPack] Copied .prisma → ${dest}`);
};

function copyDirSync(src, dest, keepSuffix) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(s, d, keepSuffix);
    } else {
      // Skip engine binaries for other architectures
      if (keepSuffix && entry.name.endsWith('.node') && entry.name.startsWith('libquery_engine-')) {
        const expectedName = `libquery_engine-${keepSuffix}.dylib.node`;
        if (entry.name !== expectedName) {
          console.log(`[afterPack]   Skipping ${entry.name} (not needed for this arch)`);
          continue;
        }
      }
      fs.copyFileSync(s, d);
    }
  }
}
