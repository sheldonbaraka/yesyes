import { Link, NavLink } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import AuthModal from './AuthModal'
import WelcomeBanner from './WelcomeBanner'
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import React from 'react'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/tasks', label: 'Tasks & Chores' },
  { to: '/shopping', label: 'Shopping & Meals' },
  { to: '/budget', label: 'Budget & Finance' },
  { to: '/communication', label: 'Communication' },
  { to: '/documents', label: 'Documents' },
  { to: '/photos', label: 'Photos & Memories' },
  { to: '/kids', label: 'Kids' },
  { to: '/home', label: 'Home' },
  { to: '/health', label: 'Health' },
  { to: '/travel', label: 'Travel' },
  { to: '/support', label: 'Support & Help' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const { currentMemberId, members, signIn, signOut } = useStore()
  const current = members.find(m => m.id === currentMemberId)

  // Auto sign-in from remembered member
  useEffect(() => {
    if (currentMemberId) return
    try {
      const remembered = localStorage.getItem('ufp-remembered-member')
      if (remembered) {
        try { signIn(remembered) } catch {}
      }
    } catch {}
  }, [currentMemberId, signIn])

  // Show welcome when signed in
  useEffect(() => {
    if (currentMemberId) {
      setShowWelcome(true)
      const t = setTimeout(() => setShowWelcome(false), 4500)
      return () => clearTimeout(t)
    }
  }, [currentMemberId])

  // Global presence heartbeat across pages
  const { pingPresence, setPresenceOffline } = useStore()
  useEffect(() => {
    pingPresence()
    const iv = setInterval(() => pingPresence(), 15000)
    const onUnload = () => setPresenceOffline()
    window.addEventListener('beforeunload', onUnload)
    return () => { clearInterval(iv); window.removeEventListener('beforeunload', onUnload); setPresenceOffline() }
  }, [pingPresence, setPresenceOffline])
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr]">
      <header className="border-b border-theme surface">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg">Family Portal</Link>
          <div className="flex gap-2 items-center">
            <input className="px-3 py-1.5 rounded border border-theme surface" placeholder="Search…" />
            <ThemeToggle />
            {current ? (
              <>
                <button className="px-3 py-1.5 rounded border border-theme" onClick={()=>setAuthOpen(true)}>
                  {current.name}
                </button>
                <button className="px-3 py-1.5 rounded border border-theme" onClick={()=>{ try { signOut() } catch {} }}>
                  Sign Out
                </button>
              </>
            ) : (
              <button className="px-3 py-1.5 rounded btn-primary" onClick={()=>setAuthOpen(true)}>Sign In</button>
            )}
          </div>
        </div>
      </header>
      <div className="grid grid-cols-[220px_1fr]">
        <aside className="border-r border-theme surface">
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${isActive ? 'surface font-medium' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="p-4">
          <WelcomeBanner visible={showWelcome && !!current} onHide={() => setShowWelcome(false)} />
          {children}
        </main>
      </div>
      <AuthModal open={authOpen} onClose={()=>setAuthOpen(false)} />
    </div>
  )
}