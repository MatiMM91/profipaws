import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'
import { darkTheme, lightTheme } from './colors'

const THEME_KEY = 'profipaws_theme'
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const system = useColorScheme()
  const [preference, setPreference] = useState('system')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPreference(v)
      setReady(true)
    })
  }, [])

  const resolved = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference
  const colors = resolved === 'dark' ? darkTheme : lightTheme

  const setTheme = useCallback(async (next) => {
    setPreference(next)
    await AsyncStorage.setItem(THEME_KEY, next)
  }, [])

  const toggleTheme = useCallback(() => {
    const next = resolved === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }, [resolved, setTheme])

  const value = useMemo(
    () => ({ ready, preference, theme: resolved, colors, setTheme, toggleTheme, isDark: resolved === 'dark' }),
    [ready, preference, resolved, colors, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
