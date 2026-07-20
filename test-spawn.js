const { execSync, spawnSync } = require('child_process');
try {
  const pyCmd = 'python3';
  const absPath = execSync(`which ${pyCmd}`).toString().trim();
  console.log('Absolute path:', absPath);
  const result = spawnSync(absPath, ['-m', 'pip', '--version']);
  console.log('spawnSync status:', result.status);
  console.log('spawnSync stdout:', result.stdout ? result.stdout.toString() : null);
  console.log('spawnSync stderr:', result.stderr ? result.stderr.toString() : null);
  console.log('spawnSync error:', result.error);
} catch (e) {
  console.error('Failed:', e);
}
