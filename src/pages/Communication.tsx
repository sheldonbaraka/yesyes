import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'

export default function Communication() {
  const {
    members,
    currentMemberId,
    chatMessages,
    sendChatMessage,
    setTyping,
    chatTyping,
    announcements,
    addAnnouncement,
    polls,
    addPoll,
    votePoll,
    presence,
    pingPresence,
    setPresenceOffline,
    markDelivered,
    markRead,
  } = useStore()

  const [text, setText] = useState('')
  const [typingTimer, setTypingTimer] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const me = members.find(m => m.id === currentMemberId) || members[0]

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [chatMessages.length])

  // Presence heartbeat and cleanup
  useEffect(() => {
    pingPresence()
    const iv = setInterval(() => pingPresence(), 15000)
    const onUnload = () => setPresenceOffline()
    window.addEventListener('beforeunload', onUnload)
    return () => { clearInterval(iv); window.removeEventListener('beforeunload', onUnload); setPresenceOffline() }
  }, [pingPresence, setPresenceOffline])

  // Delivery and read receipts
  useEffect(() => {
    const myId = me?.id
    if (!myId) return
    chatMessages.forEach(m => {
      if (m.senderId !== myId && !(m.deliveredBy || []).includes(myId)) {
        markDelivered(m.id)
      }
    })
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      const toMark = chatMessages.filter(m => m.senderId !== myId && !(m.readBy || []).includes(myId))
      toMark.slice(-5).forEach(m => { markRead(m.id) })
    }
  }, [chatMessages, markDelivered, markRead, me?.id])

  function onChangeText(v: string) {
    setText(v)
    setTyping(true)
    if (typingTimer) window.clearTimeout(typingTimer)
    const t = window.setTimeout(() => setTyping(false), 1200)
    setTypingTimer(t)
  }

  function onSend() {
    if (!text.trim()) return
    sendChatMessage(text)
    setText('')
    setTyping(false)
    if (typingTimer) window.clearTimeout(typingTimer)
    setTypingTimer(null)
  }

  function nameFor(memberId?: string) {
    const m = members.find(x => x.id === memberId)
    return m?.name || 'Unknown'
  }

  const typingNames = useMemo(() => {
    const now = Date.now()
    const names = Object.entries(chatTyping)
      .filter(([mid, ts]) => mid !== me?.id && ts && (now - (ts as number)) < 2000)
      .map(([mid]) => nameFor(mid))
    return names
  }, [chatTyping, members, me?.id])

  // Announcements
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementUrgent, setAnnouncementUrgent] = useState(false)
  function onAddAnnouncement() {
    const t = announcementText.trim()
    if (!t) return
    addAnnouncement(t, announcementUrgent)
    setAnnouncementText('')
    setAnnouncementUrgent(false)
  }

  // Polls
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  function setOption(idx: number, val: string) {
    setPollOptions((opts) => opts.map((o, i) => i === idx ? val : o))
  }
  function addOption() {
    setPollOptions((opts) => [...opts, ''])
  }
  function createPoll() {
    const q = pollQuestion.trim()
    const opts = pollOptions.map(o => o.trim()).filter(Boolean)
    if (!q || opts.length < 2) return
    addPoll(q, opts)
    setPollQuestion('')
    setPollOptions(['', ''])
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Communication Hub</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Group Chat */}
        <div className="p-4 border rounded bg-white dark:bg-gray-800 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Group Chat</div>
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span>You: {me?.name}</span>
              <div className="hidden md:flex items-center gap-2">
                {members.map(m => {
                  const last = presence[m.id]
                  const now = Date.now()
                  const online = last && (now - last) < 30000
                  const away = last && (now - last) >= 30000 && (now - last) < 120000
                  return (
                    <div key={m.id} className="flex items-center gap-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-500' : away ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                      <span>{m.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 pr-2">
            {chatMessages.map((m) => (
              <div key={m.id} className={`max-w-[80%] ${m.senderId === me?.id ? 'ml-auto' : ''}`}>
                <div className={`px-3 py-2 rounded shadow text-sm ${m.senderId === me?.id ? 'bg-blue-50 dark:bg-blue-900' : 'bg-gray-50 dark:bg-gray-700'}`}>
                  <div className="text-xs text-gray-500 mb-1">{m.senderId === me?.id ? 'You' : nameFor(m.senderId)} • {new Date(m.createdAt).toLocaleTimeString()}</div>
                  <div>{m.text}</div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    {(m.readBy || []).length > 0
                      ? `Read by ${(m.readBy || []).length}`
                      : (m.deliveredBy || []).length > 1
                        ? `Delivered to ${(m.deliveredBy || []).length - 1}`
                        : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500 h-5">
            {typingNames.length > 0 && (<span>{typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...</span>)}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={text}
              onChange={(e) => onChangeText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSend() }}
              placeholder="Type a message"
              className="flex-1 px-3 py-2 rounded border bg-white dark:bg-gray-900"
            />
            <button onClick={onSend} className="px-3 py-2 rounded bg-blue-600 text-white">Send</button>
          </div>
        </div>

        {/* Announcements & Polls */}
        <div className="p-4 border rounded bg-white dark:bg-gray-800 space-y-4">
          <div className="font-medium">Announcements & Polls</div>
          {/* Announcement form */}
          <div className="space-y-2">
            <div className="text-sm font-medium">New Announcement</div>
            <input
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Share an update with everyone"
              className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={announcementUrgent} onChange={(e) => setAnnouncementUrgent(e.target.checked)} />
              Mark as urgent
            </label>
            <button onClick={onAddAnnouncement} className="px-3 py-2 rounded bg-green-600 text-white">Post Announcement</button>
          </div>

          {/* Announcements list */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Recent Announcements</div>
            {announcements.slice().reverse().map(a => (
              <div key={a.id} className={`px-3 py-2 rounded border text-sm ${a.urgent ? 'border-red-400 bg-red-50 dark:bg-red-900' : 'bg-gray-50 dark:bg-gray-700'}`}>
                <div className="flex items-center justify-between">
                  <div>{a.text}</div>
                  <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()} {a.urgent ? '• Urgent' : ''}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Polls */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Create Poll</div>
            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="What should we decide?"
              className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900"
            />
            <div className="space-y-2">
              {pollOptions.map((opt, idx) => (
                <input
                  key={idx}
                  value={opt}
                  onChange={(e) => setOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900"
                />
              ))}
              <button onClick={addOption} className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700">Add Option</button>
        <button onClick={createPoll} className="px-3 py-2 rounded btn-primary">Create Poll</button>
            </div>
            <div className="space-y-3 pt-2">
              {polls.map(p => (
                <div key={p.id} className="p-3 rounded border bg-gray-50 dark:bg-gray-700">
                  <div className="font-medium mb-2">{p.question}</div>
                  <div className="space-y-2">
                    {p.options.map(opt => {
                      const votes = opt.votes?.length || 0
                      const mine = !!opt.votes?.includes(me?.id || '')
                      return (
                        <button
                          key={opt.id}
                          onClick={() => votePoll(p.id, opt.id)}
                          className={`w-full text-left px-3 py-2 rounded border ${mine ? 'bg-blue-100 dark:bg-blue-900' : 'bg-white dark:bg-gray-900'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt.text}</span>
                            <span className="text-xs text-gray-500">{votes} vote{votes === 1 ? '' : 's'}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}