const stripAnsi = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
const raw = '\u001b[31mRed text\u001b[0m and \u001b[1mBold\u001b[0m';
console.log('Raw:', JSON.stringify(raw));
console.log('Sanitized:', JSON.stringify(stripAnsi(raw)));
