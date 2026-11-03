import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { isDemoUser, getStoredUser } from '../auth'
import { fetchSubscriptionTier } from '../billing'

/**
 * App features require Pro (or the shared demo sandbox).
 * Unpaid accounts are sent to /planes — trial is the Demo, purchase starts from there.
 * Re-checks on bfcache restore so Back from Stripe cannot reopen Mis mascotas.
 */
export default function RequirePro() {
  const [ok, setOk] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function gate() {
      if (isDemoUser(getStoredUser())) {
        if (!cancelled) setOk(true)
        return
      }
      const tier = await fetchSubscriptionTier()
      if (cancelled) return
      if (tier === 'pro') {
        setOk(true)
        return
      }
      // replace: Back must not return to a free dashboard snapshot
      window.location.replace('/planes?upgrade=required')
    }

    gate()

    function onPageShow(e) {
      if (e.persisted) {
        setOk(false)
        gate()
      }
    }
    window.addEventListener('pageshow', onPageShow)
    return () => {
      cancelled = true
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  if (!ok) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-cyan-800 dark:text-cyan-200">
        Redirigiendo…
      </div>
    )
  }

  return <Outlet />
}
