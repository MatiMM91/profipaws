import { Link } from 'react-router-dom'
import { PawPrint, Shield, Building2, QrCode, ArrowRight } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function loginWithGoogle() {
  // Dev flow: use stub token until Google OAuth is wired
  const email = prompt('Dev login — introduce tu email:') || 'demo@profipaws.com'
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: `dev:${email}` }),
  })
  if (!res.ok) {
    alert('Error al iniciar sesión')
    return
  }
  const data = await res.json()
  localStorage.setItem('profipaws_token', data.access_token)
  localStorage.setItem('profipaws_user', JSON.stringify(data.user))
  window.location.href = '/dashboard'
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-hero-glow bg-cyan-950 text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500">
            <PawPrint size={20} />
          </span>
          Profipaws
        </div>
        <div className="flex items-center gap-3">
          <Link to="/pricing" className="hidden text-sm text-cyan-100/80 hover:text-white sm:inline">
            Planes
          </Link>
          <button type="button" onClick={loginWithGoogle} className="btn-primary bg-cyan-500 hover:bg-cyan-400">
            Iniciar sesión con Google
          </button>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-24 pt-10 lg:grid-cols-2 lg:pt-16">
        <div className="animate-fade-up">
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Pasaporte digital de salud
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Profipaws
          </h1>
          <p className="mt-5 max-w-lg text-lg text-cyan-100/85">
            Historial médico de tu mascota siempre a mano — para dueños y clínicas veterinarias,
            con acceso seguro por PIN/QR y API B2B.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={loginWithGoogle} className="btn-primary gap-2 bg-cyan-500 hover:bg-cyan-400">
              Empezar gratis <ArrowRight size={16} />
            </button>
            <Link to="/pricing" className="btn-secondary border-cyan-400/40 bg-transparent text-cyan-50 hover:bg-cyan-900/50">
              Ver planes Pro
            </Link>
          </div>
        </div>

        <div className="animate-fade-up-delay relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-800/60 to-teal-900/40 p-8 shadow-2xl shadow-cyan-950/50">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl animate-pulse-soft" />
          <div className="relative space-y-4">
            <Feature icon={Shield} title="Expediente clínico" desc="Vacunas, cirugías, exámenes y PDFs en un solo lugar." />
            <Feature icon={QrCode} title="Acceso veterinario" desc="PIN de 6 dígitos o QR temporal en consulta, sin crear cuenta." />
            <Feature icon={Building2} title="Integración B2B" desc="API Keys para clínicas que leen e inyectan historial por chip." />
          </div>
        </div>
      </section>
    </div>
  )
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
        <Icon size={20} />
      </span>
      <div>
        <h3 className="font-display font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-cyan-100/70">{desc}</p>
      </div>
    </div>
  )
}
