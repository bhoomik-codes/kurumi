import dotenv from 'dotenv';
dotenv.config();
const DAEMON_URL = `http://${process.env.KURUMI_DAEMON_HOST || '127.0.0.1'}:${process.env.KURUMI_DAEMON_PORT || '47392'}`

class DatabaseServiceProxy {
  async run(sql: string, params: any[] = []) {
    const res = await fetch(`${DAEMON_URL}/db/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params })
    })
    if (!res.ok) throw new Error(`DB proxy run failed: ${res.statusText}`)
    return res.json()
  }

  async get(sql: string, params: any[] = []) {
    const res = await fetch(`${DAEMON_URL}/db/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params })
    })
    if (!res.ok) throw new Error(`DB proxy get failed: ${res.statusText}`)
    return res.json()
  }

  async all(sql: string, params: any[] = []) {
    const res = await fetch(`${DAEMON_URL}/db/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params })
    })
    if (!res.ok) throw new Error(`DB proxy all failed: ${res.statusText}`)
    return res.json()
  }
}

export const dbService = new DatabaseServiceProxy()
