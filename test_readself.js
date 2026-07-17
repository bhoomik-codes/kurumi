const fs = require('fs');
try {
  const src = fs.readFileSync(__filename, 'utf-8');
  console.log("Read OK, first 100 chars:", JSON.stringify(src.slice(0, 100)));
  console.log("Length:", src.length);
} catch (e) {
  console.error("Read failed:", e.message);
}
