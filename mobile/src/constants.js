import { Platform } from 'react-native'
import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra ?? {}

/**
 * Resolve API base URL for Expo Go / simulators / web.
 * Priority: EXPO_PUBLIC_API_URL → LAN host from Metro → localhost.
 */
function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL || extra.apiUrl
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) {
    return fromEnv.replace(/\/$/, '')
  }

  // Expo Go / dev client: hostUri is "192.168.x.x:8081"
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    ''

  if (hostUri) {
    const host = String(hostUri).split(':')[0]
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000`
    }
  }

  // Android emulator → host machine
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000'
  }

  return (fromEnv || 'http://localhost:8000').replace(/\/$/, '')
}

export const API_URL = resolveApiUrl()

export const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || extra.googleClientId || ''

export const MAINTENANCE_MODE =
  String(process.env.EXPO_PUBLIC_MAINTENANCE_MODE || extra.maintenanceMode || '')
    .toLowerCase() === 'true' ||
  String(process.env.EXPO_PUBLIC_MAINTENANCE_MODE || '') === '1'

export const FREE_PET_LIMIT = 5

export const SPECIES_OPTIONS = [
  'dog',
  'cat',
  'bird',
  'rabbit',
  'hamster',
  'guinea_pig',
  'fish',
  'turtle',
  'ferret',
  'other',
]
