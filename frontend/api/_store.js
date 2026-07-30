const g = globalThis

function store() {
  if (!g.__profipawsMobileSessions) {
    g.__profipawsMobileSessions = new Map()
  }
  return g.__profipawsMobileSessions
}

function purge(map) {
  const now = Date.now()
  for (const [key, value] of map.entries()) {
    if (!value?.exp || value.exp <= now) map.delete(key)
  }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) reject(new Error('Body too large'))
    })
    req.on('end', () => {
      if (!body) return resolve({})
      try {
        resolve(JSON.parse(body))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

module.exports = { store, purge, cors, readJson }
