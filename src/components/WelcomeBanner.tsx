import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'

function readProfile(memberId?: string): { nickname?: string; color?: string } {
  if (!memberId) return {}
  try {
    const raw = localStorage.getItem(`ufp-profile:${memberId}`)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export default function WelcomeBanner({ visible, onHide }: { visible: boolean; onHide: () => void }) {
  const { currentMemberId, members } = useStore()
  const me = members.find(m => m.id === currentMemberId)
  const profile = useMemo(() => readProfile(currentMemberId), [currentMemberId])
  const displayName = profile.nickname?.trim() || me?.name || 'Welcome'
  const accent = profile.color || '#22c55e'
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => onHide(), 4000)
    return () => clearTimeout(t)
  }, [visible, onHide])

  if (!visible || !me) return null

  return (
    <div className="mb-4">
      <div
        className="relative overflow-hidden rounded-lg p-4 text-white"
        style={{
          background: `linear-gradient(90deg, ${accent}, #9333ea, #3b82f6)`,
          boxShadow: `0 10px 20px -10px ${accent}99`
        }}
      >
        <div className={`transform transition-all duration-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
          <div className="text-sm">Welcome back</div>
          <div className="text-2xl font-bold tracking-wide">{displayName} 🎉</div>
          <div className="mt-1 text-xs opacity-90">We’ve loaded your preferences and synced your data.</div>
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 opacity-30 blur-2xl" style={{ background: '#ffffff22' }} />
      </div>
    </div>
  )
}