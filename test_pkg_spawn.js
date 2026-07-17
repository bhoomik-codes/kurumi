const { spawn } = require('child_process');
if (process.env.KURUMID_SPAWN) {
  console.log("DAEMON RUNNING via env!");
  process.exit(0);
}
console.log("MAIN RUNNING, spawning daemon...");
const child = spawn(process.execPath, [], {
  env: { ...process.env, KURUMID_SPAWN: '1' },
  stdio: 'inherit'
});
child.on('exit', code => console.log("Daemon exited with code", code));
