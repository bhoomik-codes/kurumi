const fs = require('fs')
fs.writeFileSync('/tmp/kurumi-debug.txt', `argv0: ${process.argv[0]}\nexecPath: ${process.execPath}\n`);
