#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function bumpPatch(version) {
  const parts = version.split('.').map(n => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n) || n < 0)) {
    throw new Error(`Invalid semver: ${version}`);
  }
  parts[2] += 1; // bump patch
  return parts.join('.');
}

// Update main package.json
const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const oldVersion = pkg.version || '0.0.0';
const newVersion = bumpPatch(oldVersion);
pkg.version = newVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`[version] Bumped main package.json: ${oldVersion} -> ${newVersion}`);

// Update renderer package.json
const rendererPkgPath = path.join(process.cwd(), 'src/renderer/package.json');
try {
  const rendererPkg = JSON.parse(fs.readFileSync(rendererPkgPath, 'utf8'));
  rendererPkg.version = newVersion;
  fs.writeFileSync(rendererPkgPath, JSON.stringify(rendererPkg, null, 2) + '\n', 'utf8');
  console.log(`[version] Bumped renderer package.json: ${oldVersion} -> ${newVersion}`);
} catch (error) {
  console.warn(`[version] Could not update renderer package.json: ${error.message}`);
}

console.log(`[version] Version bump complete: ${oldVersion} -> ${newVersion}`);
console.log(`[version] Remember to create a git tag: git tag v${newVersion}`);
