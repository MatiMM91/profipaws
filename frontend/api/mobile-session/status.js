const { store, purge, cors } = require('../_store')

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' })

  const nonce = String(req.query.nonce || '').trim()
  if (nonce.length < 16) {
    return res.status(400).json({ status: 'expired' })
  }

  const map = store()
  purge(map)
  const entry = map.get(nonce)
  if (!entry) return res.status(200).json({ status: 'expired' })
  if (entry.exp <= Date.now()) {
    map.delete(nonce)
    return res.status(200).json({ status: 'expired' })
  }
  if (entry.status !== 'ready') {
    return res.status(200).json({ status: 'pending' })
  }

  map.delete(nonce)
  return res.status(200).json({
    status: 'ready',
    access_token: entry.access_token,
    token_type: 'bearer',
    user: entry.user,
  })
}
