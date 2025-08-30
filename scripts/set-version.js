#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function execCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return null;
  }
}

function setVersion() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  let version;
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isBuild = process.env.NODE_ENV === 'production' || process.argv.includes('--build');
  const githubRef = process.env.GITHUB_REF;
  const githubEventName = process.env.GITHUB_EVENT_NAME;
  
  console.log('[VERSION] Environment:', { isCI, isBuild, githubRef, githubEventName });
  
  if (isCI && githubEventName === 'push' && githubRef && githubRef.startsWith('refs/tags/v')) {
    // Tag-triggered release: use the tag name (remove 'v' prefix)
    version = githubRef.replace('refs/tags/v', '');
    console.log('[VERSION] Using tag version:', version);
  } else if (isCI && githubEventName === 'workflow_dispatch') {
    // Manual workflow dispatch: use latest tag
    const latestTag = execCommand('git describe --tags --abbrev=0');
    if (latestTag && latestTag.startsWith('v')) {
      version = latestTag.replace('v', '');
      console.log('[VERSION] Using latest tag version for manual dispatch:', version);
    } else {
      // Fallback to commit hash if no tags
      const commitHash = execCommand('git rev-parse --short=6 HEAD');
      version = `0.0.0-${commitHash}`;
      console.log('[VERSION] No tags found, using commit hash:', version);
    }
  } else if (isBuild || isCI) {
    // Build context: use commit hash for version
    const commitHash = execCommand('git rev-parse --short=6 HEAD');
    if (commitHash) {
      version = `0.0.0-${commitHash}`;
      console.log('[VERSION] Using commit hash for build:', version);
    } else {
      // Fallback if git is not available
      version = packageJson.version;
      console.log('[VERSION] Git not available, keeping current version:', version);
    }
  } else {
    // Local development: don't modify package.json, just return current version
    version = packageJson.version;
    console.log('[VERSION] Development mode: keeping current version:', version);
    return version; // Early return - don't modify files
  }
  
  // Update package.json
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  // Also update renderer package.json if it exists
  const rendererPackageJsonPath = path.join(__dirname, '..', 'src', 'renderer', 'package.json');
  if (fs.existsSync(rendererPackageJsonPath)) {
    const rendererPackageJson = JSON.parse(fs.readFileSync(rendererPackageJsonPath, 'utf8'));
    rendererPackageJson.version = version;
    fs.writeFileSync(rendererPackageJsonPath, JSON.stringify(rendererPackageJson, null, 2) + '\n');
    console.log('[VERSION] Updated renderer package.json version to:', version);
  }
  
  console.log('[VERSION] Set version to:', version);
  return version;
}

if (require.main === module) {
  setVersion();
}

module.exports = { setVersion };
