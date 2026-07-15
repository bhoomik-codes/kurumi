import { dbService } from '../src/daemon/db'
import { startDaemon } from '../src/daemon/server'
import { v4 as uuidv4 } from 'uuid'

const DAEMON_URL = 'http://127.0.0.1:47392'

async function stressTest() {
  console.log('Starting daemon for stress test...')
  // Start daemon in background or assume it's running
  
  const ITERATIONS = 20;
  let successCount = 0;
  let failCount = 0;
  
  const promises = [];
  
  // Create a conversation to insert into
  const convId = uuidv4()
  
  try {
    const res = await fetch(`${DAEMON_URL}/db/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: 'INSERT INTO conversations (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        params: [convId, 'Stress Test', 'test-model', Date.now(), Date.now()]
      })
    })
    if (!res.ok) {
      console.error('Conversation creation failed:', await res.text())
      process.exit(1)
    }
  } catch (e) {
    console.error('Failed to create conversation', e)
    process.exit(1)
  }

  console.log(`Starting ${ITERATIONS} concurrent writes from two simulated clients (GUI and CLI)`)
  
  for (let i = 0; i < ITERATIONS; i++) {
    const guiPromise = fetch(`${DAEMON_URL}/db/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: 'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
        params: [uuidv4(), convId, 'user', `GUI Message ${i}`, Date.now()]
      })
    }).then(async r => {
      if (r.ok) successCount++
      else {
        const err = await r.text()
        console.error('GUI Error:', err)
        failCount++
      }
    })

    const cliPromise = fetch(`${DAEMON_URL}/db/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: 'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
        params: [uuidv4(), convId, 'user', `CLI Message ${i}`, Date.now()]
      })
    }).then(async r => {
      if (r.ok) successCount++
      else {
        const err = await r.text()
        console.error('CLI Error:', err)
        failCount++
      }
    })

    promises.push(guiPromise, cliPromise)
  }

  await Promise.all(promises)
  
  console.log(`Stress test complete!`)
  console.log(`Successful writes: ${successCount}`)
  console.log(`Failed writes (locked): ${failCount}`)
  
  if (failCount === 0) {
    console.log('\x1b[32mPASS: No locking errors detected during concurrent writes.\x1b[0m')
  } else {
    console.log('\x1b[31mFAIL: Locking errors occurred!\x1b[0m')
  }
}

stressTest().catch(console.error)
