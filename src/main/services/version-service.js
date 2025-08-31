const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class VersionService {
  constructor() {
    this.packageJsonPath = path.join(process.cwd(), 'package.json');
  }

  /**
   * Get the base version from package.json
   */
  getBaseVersion() {
    try {
      const pkg = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      return pkg.version || '0.0.0';
    } catch (error) {
      console.error('[VERSION] Failed to read package.json version:', error);
      return '0.0.0';
    }
  }

  /**
   * Get the current git commit hash (6 characters)
   */
  getCurrentCommitHash() {
    try {
      return execSync('git rev-parse --short=6 HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      console.error('[VERSION] Failed to get current commit hash:', error);
      return null;
    }
  }

  /**
   * Get the latest git tag and its commit hash
   */
  getLatestTag() {
    try {
      // Get the latest tag
      const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
      
      // Get the commit hash of that tag (6 characters)
      const tagCommitHash = execSync(`git rev-list -n 1 ${tag}`, { encoding: 'utf8' }).trim();
      const shortTagCommitHash = tagCommitHash.substring(0, 6); // Get 6-char hash
      
      return {
        tag,
        commitHash: shortTagCommitHash
      };
    } catch (error) {
      console.error('[VERSION] Failed to get latest tag:', error);
      return null;
    }
  }

  /**
   * Get the display version based on git state
   * - If current commit matches tag commit: return tag name (e.g., "v0.0.50")
   * - If current commit differs from tag commit: return tag + current hash (e.g., "v0.0.50-abc1234")
   * - If no tags exist: return package.json version + current hash (e.g., "0.0.50-abc1234")
   */
  getDisplayVersion() {
    const baseVersion = this.getBaseVersion();
    const currentHash = this.getCurrentCommitHash();
    const latestTag = this.getLatestTag();

    // If we can't get git info, return base version
    if (!currentHash) {
      console.log('[VERSION] No git info available, using base version:', baseVersion);
      return baseVersion;
    }

    // If no tags exist, return version with current hash
    if (!latestTag) {
      const versionWithHash = `${baseVersion}-${currentHash}`;
      console.log('[VERSION] No tags found, using version with current hash:', versionWithHash);
      return versionWithHash;
    }

    // If current commit matches tag commit, return clean tag name
    if (currentHash === latestTag.commitHash) {
      console.log('[VERSION] Current commit matches tag commit, using tag:', latestTag.tag);
      return latestTag.tag;
    }

    // If current commit differs from tag commit, return tag with current hash
    const versionWithHash = `${latestTag.tag}-${currentHash}`;
    console.log('[VERSION] Current commit differs from tag, using tag with hash:', versionWithHash);
    return versionWithHash;
  }
}

module.exports = VersionService;
