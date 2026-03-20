const path = require('path');
const fs = require('fs');

// electron-builder refuses to pack dot-directories (.prisma).
// This hook copies node_modules/.prisma into the unpacked output after packing.
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

  copyDirSync(src, dest);
  console.log(`[afterPack] Copied .prisma → ${dest}`);
};

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}
