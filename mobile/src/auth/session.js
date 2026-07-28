import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const TOKEN_KEY = 'profipaws_token'
const USER_KEY = 'profipaws_user'

async function setItem(key, value) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

async function getItem(key) {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key)
  }
  return SecureStore.getItemAsync(key)
}

async function deleteItem(key) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}

export async function getToken() {
  return getItem(TOKEN_KEY)
}

export async function getStoredUser() {
  try {
    const raw = await getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function setSession(accessToken, user) {
  if (!accessToken) throw new Error('Missing access token')
  await setItem(TOKEN_KEY, accessToken)
  await setItem(USER_KEY, JSON.stringify(user || null))
}

export async function clearSession() {
  await deleteItem(TOKEN_KEY)
  await deleteItem(USER_KEY)
}
