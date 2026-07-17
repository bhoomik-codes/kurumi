process.on('uncaughtException', e => console.error("UNCAUGHT", e.stack));
process.on('unhandledRejection', e => console.error("UNHANDLED", e.stack));
require('./dist/cli.js');
