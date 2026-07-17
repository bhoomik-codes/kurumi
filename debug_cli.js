const { spawn } = require('child_process');
const fs = require('fs');
const child = spawn('/home/bixpurr/Desktop/Study/KURUMI/kurumi-electron/dist/kurumi-cli', ['server'], {
  detached: true,
  stdio: 'inherit'
});
child.on('error', err => fs.writeFileSync('/tmp/kurumi-spawn-err.log', err.message));
child.on('exit', code => fs.writeFileSync('/tmp/kurumi-exit-code.log', String(code)));
