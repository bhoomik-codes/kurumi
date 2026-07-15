"use strict";

// node_modules/uuid/dist-node/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

// node_modules/uuid/dist-node/rng.js
var rnds8 = new Uint8Array(16);
function rng() {
  return crypto.getRandomValues(rnds8);
}

// node_modules/uuid/dist-node/v4.js
function v4(options, buf, offset) {
  if (!buf && !options && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return _v4(options, buf, offset);
}
function _v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    if (offset < 0 || offset + 16 > buf.length) {
      throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
    }
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// scripts/stress-test.ts
var DAEMON_URL = "http://127.0.0.1:47392";
async function stressTest() {
  console.log("Starting daemon for stress test...");
  const ITERATIONS = 20;
  let successCount = 0;
  let failCount = 0;
  const promises = [];
  const convId = v4_default();
  try {
    const res = await fetch(`${DAEMON_URL}/db/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sql: "INSERT INTO conversations (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        params: [convId, "Stress Test", "test-model", Date.now(), Date.now()]
      })
    });
    if (!res.ok) {
      console.error("Conversation creation failed:", await res.text());
      process.exit(1);
    }
  } catch (e) {
    console.error("Failed to create conversation", e);
    process.exit(1);
  }
  console.log(`Starting ${ITERATIONS} concurrent writes from two simulated clients (GUI and CLI)`);
  for (let i = 0; i < ITERATIONS; i++) {
    const guiPromise = fetch(`${DAEMON_URL}/db/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sql: "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        params: [v4_default(), convId, "user", `GUI Message ${i}`, Date.now()]
      })
    }).then(async (r) => {
      if (r.ok) successCount++;
      else {
        const err = await r.text();
        console.error("GUI Error:", err);
        failCount++;
      }
    });
    const cliPromise = fetch(`${DAEMON_URL}/db/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sql: "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        params: [v4_default(), convId, "user", `CLI Message ${i}`, Date.now()]
      })
    }).then(async (r) => {
      if (r.ok) successCount++;
      else {
        const err = await r.text();
        console.error("CLI Error:", err);
        failCount++;
      }
    });
    promises.push(guiPromise, cliPromise);
  }
  await Promise.all(promises);
  console.log(`Stress test complete!`);
  console.log(`Successful writes: ${successCount}`);
  console.log(`Failed writes (locked): ${failCount}`);
  if (failCount === 0) {
    console.log("\x1B[32mPASS: No locking errors detected during concurrent writes.\x1B[0m");
  } else {
    console.log("\x1B[31mFAIL: Locking errors occurred!\x1B[0m");
  }
}
stressTest().catch(console.error);
