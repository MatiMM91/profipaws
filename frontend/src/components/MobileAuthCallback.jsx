/**
 * Transient landing for Expo openAuthSessionAsync.
 * The app intercepts this HTTPS URL; users may only glimpse it.
 */
export default function MobileAuthCallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #ecfeff 0%, #ffffff 45%, #ccfbf1 100%)',
        color: '#0e7490',
        fontFamily: '"Source Sans 3", system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: 24 }}>Profipaws</h1>
        <p style={{ marginTop: 8 }}>Volviendo a la app…</p>
      </div>
    </div>
  )
}
