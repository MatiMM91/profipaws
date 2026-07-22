/** Production lock: set VITE_MAINTENANCE_MODE=true on Vercel. */
export const MAINTENANCE_MODE =
  String(import.meta.env.VITE_MAINTENANCE_MODE || '').toLowerCase() === 'true' ||
  String(import.meta.env.VITE_MAINTENANCE_MODE || '') === '1'
