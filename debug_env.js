const { spawn } = require('child_process');
const child = spawn('/home/bixpurr/Desktop/Study/KURUMI/kurumi-electron/dist/kurumi-cli', ['server'], {
  env: { ...process.env, PKG_EXECPATH: undefined }
});
