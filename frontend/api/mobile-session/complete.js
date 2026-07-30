const { store, purge, cors, readJson } = require('../_store')

const TTL_MS = 5 * 60 * 1000

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' })

  try {
    const body = await readJson(req)
    const nonce = String(body.nonce || '').trim()
    const accessToken = String(body.access_token || '').trim()
    const user = body.user || null
    if (nonce.length < 16 || !accessToken) {
      return res.status(400).json({ detail: 'nonce o access_token inválidos' })
    }

    const map = store()
    purge(map)
    const existing = map.get(nonce)
    if (!existing || existing.exp <= Date.now()) {
      return res.status(400).json({
        detail: 'Sesión móvil expirada. Cierra esta ventana y vuelve a intentarlo desde la app.',
      })
    }

    map.set(nonce, {
      status: 'ready',
      access_token: accessToken,
      user,
      exp: Date.now() + TTL_MS,
    })
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(400).json({ detail: e.message || 'Bad request' })
  }
}
