import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { isDemoUser, getStoredUser } from '../auth'
import { fetchSubscriptionTier, redirectToCheckout } from '../billing'

/**
 * App features require Pro (or the shared demo sandbox).
 * Free Google accounts are sent straight to Stripe Checkout — trial is the Demo.
 */
export default function RequirePro() {
  const [ok, setOk] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
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
      await redirectToCheckout({ cancelPath: '/planes' })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ok) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-cyan-800 dark:text-cyan-200">
        Redirigiendo al pago…
      </div>
    )
  }

  return <Outlet />
}
