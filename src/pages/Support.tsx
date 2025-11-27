import { useMemo, useState } from 'react'

type FaqItem = { q: string; a: string }

const FAQ: FaqItem[] = [
  { q: 'How do I add family members?', a: 'Go to Login → Sign Up. Only the five allowed names can register. Each account requires a valid email and a strong password.' },
  { q: 'How do I enable real-time syncing?', a: 'Tabs on the same device sync automatically. For cross-device sync, set VITE_WS_URL to a WebSocket broadcaster and reload.' },
  { q: 'How do I manage tasks and events?', a: 'Use the Tasks and Calendar tabs. Tasks support completion toggles; events can be categorized and assigned to members.' },
  { q: 'How can I recover my session?', a: 'If you checked “Remember me”, your session auto-loads. Otherwise, login using your email and password.' },
]

function saveRequest(req: { name: string; email: string; topic: string; message: string }) {
  try {
    const key = 'ufp-support-requests'
    const prev = JSON.parse(localStorage.getItem(key) || '[]')
    prev.push({ ...req, createdAt: new Date().toISOString() })
    localStorage.setItem(key, JSON.stringify(prev))
  } catch {}
}

export default function Support() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const topics = useMemo(() => ['Account & Login', 'Real-time Sync', 'Tasks & Calendar', 'Documents & Photos', 'Other'], [])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState(topics[0])
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  function validateEmail(val: string) {
    return /.+@.+\..+/.test(val)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (!name.trim()) { setStatus('Please enter your name'); return }
    if (!validateEmail(email)) { setStatus('Enter a valid email'); return }
    if (!message.trim()) { setStatus('Please describe your issue'); return }
    saveRequest({ name, email, topic, message })
    setStatus('Thanks! Your request has been recorded. We will reach out by email.')
    setMessage('')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Support & Help</h1>

      {/* Quick Help / FAQ */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="text-lg font-medium mb-2">Help Center & FAQ</h2>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {FAQ.map((item, idx) => (
              <li key={idx} className="py-2">
                <button
                  className="w-full text-left flex items-center justify-between"
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                >
                  <span className="font-medium">{item.q}</span>
                  <span className="text-xs">{openIdx === idx ? 'Hide' : 'Show'}</span>
                </button>
                {openIdx === idx && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.a}</p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Contact & Links */}
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="text-lg font-medium mb-2">Contact Support</h2>
          <div className="space-y-2">
        <a href="mailto:support@example.com" className="inline-block px-3 py-2 rounded btn-primary">Email Support</a>
            <a href="tel:+1234567890" className="inline-block px-3 py-2 rounded border">Call</a>
            <a href="https://wa.me/1234567890" target="_blank" rel="noreferrer" className="inline-block px-3 py-2 rounded border">WhatsApp</a>
          </div>
          <p className="mt-3 text-xs text-gray-500">We aim to respond within 24–48 hours.</p>
        </div>
      </div>

      {/* Submit a request */}
      <div className="p-4 border rounded bg-white dark:bg-gray-800">
        <h2 className="text-lg font-medium mb-3">Submit a Support Request</h2>
        <form className="grid md:grid-cols-2 gap-3 items-start" onSubmit={submit}>
          <div>
            <label className="block text-sm mb-1">Your Name</label>
            <input className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Topic</label>
            <select className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={topic} onChange={e=>setTopic(e.target.value)}>
              {topics.map(t => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Message</label>
            <textarea className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900 h-28" value={message} onChange={e=>setMessage(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <button type="submit" className="px-4 py-2 rounded btn-primary">Send Request</button>
            {status && <span className="text-sm text-green-600">{status}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}