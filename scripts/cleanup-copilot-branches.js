#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

console.log('🧹 Copilot Branch Cleanup Tool');
console.log('================================\n');

function runCommand(command, silent = false) {
  try {
    const result = execSync(command, { encoding: 'utf8' });
    return result.trim();
  } catch (error) {
    if (!silent) {
      console.error(`❌ Error running command: ${command}`);
      console.error(error.message);
    }
    return null;
  }
}

function getCopilotBranches() {
  // Get all local branches that match copilot patterns
  const allBranches = runCommand('git branch --format="%(refname:short)"');
  if (!allBranches) return [];
  
  const copilotPatterns = [
    /^copilot\//,
    /^copilot-/,
    /^fix-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
    /^feature-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
    /^temp-copilot/,
    /^ai-/,
    /^assistant-/
  ];
  
  return allBranches
    .split('\n')
    .filter(branch => branch.trim())
    .filter(branch => copilotPatterns.some(pattern => pattern.test(branch.trim())));
}

function getRemoteCopilotBranches() {
  // Get remote branches that match copilot patterns
  const remoteBranches = runCommand('git branch -r --format="%(refname:short)"');
  if (!remoteBranches) return [];
  
  const copilotPatterns = [
    /^origin\/copilot\//,
    /^origin\/copilot-/,
    /^origin\/fix-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
    /^origin\/feature-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
    /^origin\/temp-copilot/,
    /^origin\/ai-/,
    /^origin\/assistant-/
  ];
  
  return remoteBranches
    .split('\n')
    .filter(branch => branch.trim())
    .filter(branch => copilotPatterns.some(pattern => pattern.test(branch.trim())))
    .map(branch => branch.replace('origin/', ''));
}

function getBranchLastCommitDate(branch) {
  const timestamp = runCommand(`git log -1 --format="%ct" ${branch}`, true);
  if (!timestamp) return null;
  return new Date(parseInt(timestamp) * 1000);
}

function getCurrentBranch() {
  return runCommand('git branch --show-current');
}

function isWorkingTreeClean() {
  const status = runCommand('git status --porcelain');
  return !status || status.length === 0;
}

function formatDate(date) {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main() {
  // Safety checks
  console.log('🔍 Running safety checks...\n');
  
  const currentBranch = getCurrentBranch();
  if (!currentBranch) {
    console.error('❌ Unable to determine current branch');
    process.exit(1);
  }
  
  console.log(`📍 Current branch: ${currentBranch}`);
  
  if (!isWorkingTreeClean()) {
    console.error('❌ Working tree is not clean. Please commit or stash changes first.');
    process.exit(1);
  }
  
  console.log('✅ Working tree is clean\n');
  
  // Find copilot branches
  console.log('🔍 Scanning for Copilot branches...\n');
  
  const localCopilotBranches = getCopilotBranches();
  const remoteCopilotBranches = getRemoteCopilotBranches();
  
  if (localCopilotBranches.length === 0 && remoteCopilotBranches.length === 0) {
    console.log('✨ No Copilot branches found to clean up!');
    return;
  }
  
  // Analyze local branches
  if (localCopilotBranches.length > 0) {
    console.log('📋 Local Copilot branches found:');
    console.log('--------------------------------');
    
    const branchInfo = localCopilotBranches.map(branch => {
      const lastCommit = getBranchLastCommitDate(branch);
      const daysOld = lastCommit ? Math.floor((Date.now() - lastCommit.getTime()) / (1000 * 60 * 60 * 24)) : 'unknown';
      return {
        name: branch,
        lastCommit,
        daysOld,
        isCurrent: branch === currentBranch
      };
    });
    
    branchInfo.forEach(info => {
      const age = info.daysOld === 'unknown' ? 'unknown age' : `${info.daysOld} days old`;
      const current = info.isCurrent ? ' (CURRENT)' : '';
      const lastCommitStr = info.lastCommit ? formatDate(info.lastCommit) : 'unknown';
      console.log(`  • ${info.name}${current}`);
      console.log(`    Last commit: ${lastCommitStr} (${age})`);
    });
    
    console.log();
    
    // Ask about local cleanup
    const cleanupLocal = await askQuestion('🗑️  Delete local Copilot branches? (y/N): ');
    
    if (cleanupLocal === 'y' || cleanupLocal === 'yes') {
      console.log('\n🧹 Cleaning up local branches...\n');
      
      let deletedCount = 0;
      for (const info of branchInfo) {
        if (info.isCurrent) {
          console.log(`⏭️  Skipping ${info.name} (current branch)`);
          continue;
        }
        
        try {
          runCommand(`git branch -D ${info.name}`);
          console.log(`✅ Deleted ${info.name}`);
          deletedCount++;
        } catch (error) {
          console.log(`❌ Failed to delete ${info.name}`);
        }
      }
      
      console.log(`\n🎉 Deleted ${deletedCount} local Copilot branches\n`);
    }
  }
  
  // Analyze remote branches
  if (remoteCopilotBranches.length > 0) {
    console.log('🌐 Remote Copilot branches found:');
    console.log('----------------------------------');
    
    remoteCopilotBranches.forEach(branch => {
      console.log(`  • origin/${branch}`);
    });
    
    console.log();
    
    const cleanupRemote = await askQuestion('🗑️  Delete remote Copilot branches? (y/N): ');
    
    if (cleanupRemote === 'y' || cleanupRemote === 'yes') {
      console.log('\n🌐 Cleaning up remote branches...\n');
      
      let deletedCount = 0;
      for (const branch of remoteCopilotBranches) {
        try {
          runCommand(`git push origin --delete ${branch}`);
          console.log(`✅ Deleted origin/${branch}`);
          deletedCount++;
        } catch (error) {
          console.log(`❌ Failed to delete origin/${branch}`);
        }
      }
      
      console.log(`\n🎉 Deleted ${deletedCount} remote Copilot branches\n`);
    }
  }
  
  // Cleanup tracking references
  console.log('🧹 Cleaning up stale remote tracking references...');
  runCommand('git remote prune origin');
  console.log('✅ Remote references cleaned\n');
  
  console.log('🎉 Cleanup complete!');
  console.log('\n💡 Tip: Run "git branch -a" to see remaining branches');
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
