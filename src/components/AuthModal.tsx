import { useState } from 'react'
import { useStore } from '../store'

export default function AuthModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { members, currentMemberId, signIn, signOut } = useStore()
  const [selected, setSelected] = useState<string>('')
  const [remember, setRemember] = useState<boolean>(true)
  const [nickname, setNickname] = useState<string>('')
  const [accent, setAccent] = useState<string>('#6366f1')

  if (!open) return null

  const current = members.find(m => m.id === currentMemberId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md p-4 rounded bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Sign In</h2>
          <button className="text-sm" onClick={onClose}>Close</button>
        </div>

        {current ? (
          <div className="space-y-3">
            <p className="text-sm">Signed in as <span className="font-medium">{current.name}</span></p>
            <button className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700" onClick={() => { signOut(); onClose() }}>Sign Out</button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e)=>{
            e.preventDefault();
            if(!selected) return;
            try {
              signIn(selected);
              // Save preferences and remember me
              try {
                if (remember) localStorage.setItem('ufp-remembered-member', selected)
                const profile = { nickname: nickname?.trim() || undefined, color: accent }
                localStorage.setItem(`ufp-profile:${selected}`, JSON.stringify(profile))
              } catch {}
              onClose()
            } catch(err:any){ alert(err?.message || 'Sign-in failed') }
          }}>
            <label className="block text-sm">Select your name</label>
            <select className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={selected} onChange={e=>setSelected(e.target.value)}>
              <option value="">Choose…</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1">Nickname (optional)</label>
                <input className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="e.g., Shelly" />
              </div>
              <div>
                <label className="block text-xs mb-1">Welcome color</label>
                <input type="color" className="w-full h-[38px] rounded border border-gray-300 dark:border-gray-700" value={accent} onChange={e=>setAccent(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
              Remember me on this device
            </label>
            <button className="px-3 py-2 rounded btn-primary w-full" type="submit">Sign In</button>
            <p className="text-xs text-gray-600 dark:text-gray-400">Only the five family members can sign in.</p>
          </form>
        )}
      </div>
    </div>
  )
}