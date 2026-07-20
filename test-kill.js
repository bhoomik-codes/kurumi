const { spawn } = require('child_process');
const kill = require('tree-kill');

const cp = spawn('sleep 60', { shell: true });
console.log('Spawned PID:', cp.pid);

setTimeout(() => {
  console.log('Killing PID:', cp.pid);
  kill(cp.pid, 'SIGTERM', (err) => {
    if (err) console.error(err);
    console.log('Kill signal sent');
    
    // Check ps
    setTimeout(() => {
      const ps = require('child_process').execSync('ps -ef | grep sleep').toString();
      console.log('PS Output:\n', ps);
    }, 1000);
  });
}, 1000);
