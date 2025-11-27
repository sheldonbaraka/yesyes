import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'
const KEY = 'ufp-theme'
const ACCENT_KEY = 'ufp-accent'
const THEME_NAME_KEY = 'ufp-theme-name'

function prefersDark() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(mode: ThemeMode) {
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark())
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(KEY) as ThemeMode | null
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
    } catch {}
    return 'system'
  })
  const [accent, setAccent] = useState<string>(() => {
    try {
      return localStorage.getItem(ACCENT_KEY) || 'indigo'
    } catch { return 'indigo' }
  })
  const [themeName, setThemeName] = useState<string>(() => {
    try {
      return localStorage.getItem(THEME_NAME_KEY) || 'default'
    } catch { return 'default' }
  })

  useEffect(() => {
    applyTheme(mode)
    try { localStorage.setItem(KEY, mode) } catch {}
  }, [mode])

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
    try { localStorage.setItem(ACCENT_KEY, accent) } catch {}
  }, [accent])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeName)
    try { localStorage.setItem(THEME_NAME_KEY, themeName) } catch {}
  }, [themeName])

  // Respond to OS changes when in 'system' mode
  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else if (mq.addListener) mq.addListener(handler)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler)
      else if (mq.removeListener) mq.removeListener(handler)
    }
  }, [mode])

  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="flex items-center gap-2">
        <span className="sr-only">Theme</span>
        <select
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
          value={mode}
          onChange={(e) => setMode(e.target.value as ThemeMode)}
          aria-label="Theme mode"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="sr-only">Theme Name</span>
        <select
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
          aria-label="Theme name"
        >
          <option value="default">Default</option>
          <option value="ocean">Ocean</option>
          <option value="forest">Forest</option>
          <option value="sunset">Sunset</option>
          <option value="grape">Grape</option>
          <option value="midnight">Midnight</option>
          <option value="nord">Nord</option>
          <option value="dracula">Dracula</option>
          <option value="lavender">Lavender</option>
          <option value="sand">Sand</option>
          <option value="sky">Sky</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="sr-only">Accent</span>
        <select
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          aria-label="Accent style"
        >
          <option value="indigo">Indigo</option>
          <option value="emerald">Emerald</option>
          <option value="amber">Amber</option>
          <option value="rose">Rose</option>
          <option value="slate">Slate</option>
        </select>
      </label>
    </div>
  )
}