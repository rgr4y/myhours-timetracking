const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const electronBuiltin = require('electron');

class VersionService {
  constructor(electronModule, options = {}) {
    this.electron = electronModule || electronBuiltin;
    this.packageJsonPath = path.join(process.cwd(), 'package.json');
    this.execSync = options.execSync || childProcess.execSync;
  }

  /**
   * Get the base version from app.getVersion() (packaged) or package.json (dev)
   */
  getBaseVersion() {
    try {
      // For packaged builds, use Electron's built-in version
      if (this.electron.app && this.electron.app.isPackaged) {
        const version = this.electron.app.getVersion();
        console.log('[VERSION] Using packaged app version:', version);
        return version;
      }
      
      // For development, read from package.json
      const pkg = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      const version = pkg.version || '0.0.0';
      console.log('[VERSION] Using dev package.json version:', version);
      return version;
    } catch (error) {
      console.error('[VERSION] Failed to get base version:', error);
      // Fallback to app.getVersion() if package.json fails
      try {
        return this.electron.app.getVersion();
      } catch (e) {
        console.error('[VERSION] Fallback to app.getVersion() also failed:', e);
        return '0.0.0';
      }
    }
  }

  /**
   * Get the current git commit hash (6 characters)
   */
  getCurrentCommitHash() {
    try {
      // Git may not be available in packaged builds
      return this.execSync('git rev-parse --short=6 HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      console.log('[VERSION] Git not available or not in a git repository:', error.message);
      return null;
    }
  }

  /**
   * Get the latest git tag and its commit hash
   */
  getLatestTag() {
    try {
      // Git may not be available in packaged builds
      const tag = this.execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
      
      // Get the commit hash of that tag (6 characters)
      const tagCommitHash = this.execSync(`git rev-list -n 1 ${tag}`, { encoding: 'utf8' }).trim();
      const shortTagCommitHash = tagCommitHash.substring(0, 6); // Get 6-char hash
      
      return {
        tag,
        commitHash: shortTagCommitHash
      };
    } catch (error) {
      console.log('[VERSION] Git not available or no tags found:', error.message);
      return null;
    }
  }

  /**
   * Get the display version based on git state and build type
   * - Packaged builds: Use app.getVersion() (no git info available)
   * - Dev builds: Use git-based versioning with commit hashes
   */
  getDisplayVersion() {
    const baseVersion = this.getBaseVersion();
    
    // For packaged builds, just return the app version (git info not available)
    if (this.electron.app && this.electron.app.isPackaged) {
      console.log('[VERSION] Packaged build, using app version:', baseVersion);
      return baseVersion;
    }
    
    // For development builds, use git-based versioning
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
    const versionWithHash = `${baseVersion}-${currentHash}`;
    console.log('[VERSION] Current commit differs from tag, using tag with hash:', versionWithHash);
    return versionWithHash;
  }
}

module.exports = VersionService;
