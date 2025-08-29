#!/usr/bin/env node
const { spawnSync } = require('child_process');
const { mkdirSync, copyFileSync } = require('fs');
const { join, resolve } = require('path');

// Prepare a writable SQLite template DB by running migrations at build time.
// This avoids needing Prisma CLI/migrations at runtime in the packaged app.

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with exit code ${r.status}`);
  }
}

(function main() {
  const projectRoot = resolve(__dirname, '..');
  const buildDir = join(projectRoot, 'build');
  const prismaDir = join(projectRoot, 'prisma');
  const tmpDbDir = join(buildDir, 'db');
  const tmpDbPath = join(tmpDbDir, 'template.db');
  const outTemplate = join(prismaDir, 'template.db');

  mkdirSync(tmpDbDir, { recursive: true });

  // Use migrations to create the schema in a temp DB
  const env = { ...process.env, DATABASE_URL: `file:${tmpDbPath}` };

  // Ensure client is generated first
  run(process.execPath, [require.resolve('prisma/build/index.js'), 'generate'], { env, cwd: projectRoot });
  // Apply migrations to temp DB
  run(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', join(prismaDir, 'schema.prisma')], { env, cwd: projectRoot });

  // Copy to prisma/template.db for packaging via extraResources
  copyFileSync(tmpDbPath, outTemplate);
  console.log(`[db] Prepared template DB at ${outTemplate}`);
})();

