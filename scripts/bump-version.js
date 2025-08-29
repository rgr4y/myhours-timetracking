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

const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const oldVersion = pkg.version || '0.0.0';
const newVersion = bumpPatch(oldVersion);
pkg.version = newVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`[version] Bumped version: ${oldVersion} -> ${newVersion}`);
