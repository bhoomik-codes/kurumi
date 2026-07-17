const { spawn } = require('child_process');
const child = spawn('sh', ['-c', '"/home/bixpurr/Desktop/Study/KURUMI/kurumi-electron/dist/kurumi-cli" server'], {
  detached: true,
  stdio: 'inherit'
});
