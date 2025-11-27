import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

const ALLOWED_NAMES = ['Sheldon', 'Smith', 'Mary (Mother)', 'Samuel (Dad)', 'Sidney']

export default function Login() {
  const { members, signIn, signUp, signInWithCredentials } = useStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [accent, setAccent] = useState('#6d28d9')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)
  const [showPassword, setShowPassword] = useState(false)

  const allowedOptions = useMemo(() => ALLOWED_NAMES.map(n => ({ label: n })), [])

  function validateEmail(val: string) {
    return /.+@.+\..+/.test(val)
  }
  function validatePassword(val: string) {
    return val.length >= 8 && /[A-Za-z]/.test(val) && /[0-9]/.test(val)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)
    try {
      if (mode === 'login') {
        const emailNorm = email.trim().toLowerCase()
        const pwd = password.trim()
        if (!validateEmail(emailNorm)) throw new Error('Enter a valid email')
        if (!pwd) throw new Error('Enter your password')
        await signInWithCredentials(emailNorm, pwd)
        const m = members.find(x => x.email?.trim().toLowerCase() === emailNorm)
        if (!m) throw new Error('Account not found')
        if (remember) {
          try { localStorage.setItem('ufp-remembered-member', m.id) } catch {}
        }
        try { localStorage.setItem(`ufp-profile:${m.id}`, JSON.stringify({ nickname: nickname || m.name, color: accent })) } catch {}
        navigate('/')
      } else {
        const emailNorm = email.trim().toLowerCase()
        const pwd = password.trim()
        const conf = confirm.trim()
        if (!name) throw new Error('Select your full name')
        if (!validateEmail(emailNorm)) throw new Error('Enter a valid email')
        if (!validatePassword(pwd)) throw new Error('Password must be at least 8 characters and include letters and numbers')
        if (pwd !== conf) throw new Error('Passwords do not match')
        const id = await signUp(name, emailNorm, pwd)
        signIn(id)
        if (remember) {
          try { localStorage.setItem('ufp-remembered-member', id) } catch {}
        }
        try { localStorage.setItem(`ufp-profile:${id}`, JSON.stringify({ nickname: nickname || name, color: accent })) } catch {}
        navigate('/')
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen homey-bg mesh-bg relative overflow-hidden">
      {/* Animated background title */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="animated-title opacity-10 select-none text-5xl sm:text-6xl md:text-7xl lg:text-8xl animate-fade-in">
          THE BICHANGAS
        </div>
      </div>
      <div className="absolute -left-20 top-20 w-72 h-72 bg-accent opacity-10 blur-3xl animate-float animate-morph" />
      <div className="absolute -right-20 bottom-10 w-80 h-80 bg-accent opacity-10 blur-3xl animate-float animate-morph" style={{ animationDelay: '1s' }} />

      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-theme surface text-xs">
            <span className="inline-block w-2 h-2 rounded bg-accent" />
            Family Portal
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Welcome home</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your family hub — stay organized, connected, and cozy.</p>
        </div>

        <div className="glass-card card border border-theme soft-border rounded-xl shadow-xl animate-slide-up">
          <div className="p-2 flex justify-center">
            <div className="inline-flex rounded-lg overflow-hidden border border-theme">
              <button
                className={`px-4 py-2 ${mode==='login'?'btn-primary':''}`}
                onClick={() => setMode('login')}
                type="button"
              >Login</button>
              <button
                className={`px-4 py-2 ${mode==='signup'?'btn-primary':''}`}
                onClick={() => setMode('signup')}
                type="button"
              >Sign Up</button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="p-6 space-y-4">
        {mode === 'login' ? (
          <React.Fragment>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                className="w-full border border-theme rounded px-3 py-2 surface focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <div className="relative">
                <input
                  className="w-full border border-theme rounded px-3 py-2 surface focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                  type={showPassword? 'text':'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded border border-theme hover-soft-bounce"
                  onClick={()=>setShowPassword(s=>!s)}>{showPassword? 'Hide':'Show'}</button>
              </div>
            </div>
          </React.Fragment>
        ) : (
          <div>
            <label className="block text-sm mb-1">Choose family member (restricted)</label>
            <select
              className="w-full border border-theme rounded px-3 py-2 surface focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            >
              <option value="" disabled>Select name</option>
              {allowedOptions.map(opt => (
                <option key={opt.label} value={opt.label}>{opt.label}</option>
              ))}
            </select>
            <div className="mt-3">
              <label className="block text-sm mb-1">Email</label>
              <input
                className="w-full border border-theme rounded px-3 py-2 surface focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm mb-1">Password</label>
                <input
                  className="w-full border border-theme rounded px-3 py-2 surface focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Confirm Password</label>
                <input
                  className="w-full border border-theme rounded px-3 py-2 surface focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">Welcome nickname (optional)</label>
          <input
            className="w-full border border-theme rounded px-3 py-2 surface focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
            placeholder="e.g., Mom, Coach, Champ"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="block text-sm mb-1">Welcome color</label>
            <input
              type="color"
              className="w-16 h-10 border border-theme rounded hover-soft-bounce"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
            />
          </div>
          <label className="inline-flex items-center">
            <input type="checkbox" className="mr-2" checked={remember} onChange={(e)=>setRemember(e.target.checked)} />
            Remember me on this device
          </label>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button type="submit" className="w-full px-4 py-2 btn-primary rounded hover-soft-bounce">
          {mode==='login' ? 'Login' : 'Create Account'}
        </button>
        {mode==='signup' && (
          <p className="text-xs text-muted mt-1">Security: Sign-up is limited to five predefined family members. Password must be strong (8+ chars, letters and numbers).</p>
        )}
          <div className="px-6 pb-6">
            <div className="mt-4 text-center text-xs text-muted">Protected with local encryption and restricted sign-up. Need help? Visit Support.</div>
          </div>
        </form>
      </div>
    </div>
  </div>
  )
}