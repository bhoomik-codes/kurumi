const { spawn } = require('child_process');
const child = spawn('/home/bixpurr/Desktop/Study/KURUMI/kurumi-electron/dist/kurumi-cli', ['server'], {
  detached: true,
  stdio: 'ignore'
});
child.on('error', (err) => console.log("SPAWN ERROR", err));
child.unref();
console.log("Spawned");
