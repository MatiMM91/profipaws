const { store, purge, cors, readJson } = require('../_store')

const TTL_MS = 5 * 60 * 1000

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' })

  try {
    const body = await readJson(req)
    const nonce = String(body.nonce || '').trim()
    if (nonce.length < 16 || nonce.length > 128) {
      return res.status(400).json({ detail: 'nonce inválido' })
    }
    const map = store()
    purge(map)
    map.set(nonce, { status: 'pending', exp: Date.now() + TTL_MS })
    return res.status(200).json({ ok: true, nonce })
  } catch (e) {
    return res.status(400).json({ detail: e.message || 'Bad request' })
  }
}
