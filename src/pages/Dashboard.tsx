import { useStore } from '../store'
import { isSameDay, addDays, format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type Prefs = {
  showToday: boolean
  showAnnouncements: boolean
  showCalendarPreview: boolean
  showShoppingSnapshot: boolean
  showChoreChart: boolean
  showActivityFeed: boolean
  showTasksWidget: boolean
  showBudgetWidget: boolean
  showTravelWidget: boolean
  showDocumentsWidget: boolean
}

const PREFS_KEY = 'ufp-dashboard-prefs'

export default function Dashboard() {
  const { events, tasks, lists, trips, packing, budgets, documents, members, announcements, activity, addAnnouncement, toggleTask } = useStore()
  const today = new Date()
  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY)
      if (raw) return JSON.parse(raw)
    } catch {}
    return {
      showToday: true,
      showAnnouncements: true,
      showCalendarPreview: true,
      showShoppingSnapshot: true,
      showChoreChart: true,
      showActivityFeed: true,
      showTasksWidget: true,
      showBudgetWidget: true,
      showTravelWidget: true,
      showDocumentsWidget: true,
    }
  })

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch {}
  }, [prefs])

  const filteredEvents = useMemo(() => events.filter(e => memberFilter === 'all' ? true : e.memberId === memberFilter), [events, memberFilter])
  const eventsToday = filteredEvents.filter(e => isSameDay(new Date(e.date), today))
  const tasksDue = tasks.filter(t => !t.completed && (memberFilter === 'all' ? true : t.assigneeId === memberFilter))

  const upcoming7Days = useMemo(() => {
    const end = addDays(today, 7)
    return filteredEvents.filter(e => {
      const d = new Date(e.date)
      return d >= today && d <= end
    }).sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [filteredEvents])

  const activeList = lists[0]
  const remainingItems = activeList ? activeList.items.filter(i => !i.checked).slice(0,5) : []

  const choreChart = useMemo(() => {
    const map = new Map<string, number>()
    members.forEach(m => map.set(m.id, 0))
    tasks.forEach(t => {
      if (!t.completed && t.assigneeId) map.set(t.assigneeId, (map.get(t.assigneeId) || 0) + 1)
    })
    return Array.from(map.entries()).map(([id, count]) => ({ id, count }))
  }, [tasks, members])

  // Budget summary (current month)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const monthBudgets = budgets.filter(b => {
    const d = new Date(b.date)
    return d >= monthStart && d <= monthEnd
  })
  const monthTotal = monthBudgets.reduce((sum, b) => sum + (b.amount || 0), 0)

  // Travel overview (next upcoming trip)
  const upcomingTrips = trips
    .filter(t => t.startDate ? new Date(t.startDate) >= today : false)
    .sort((a,b)=> new Date(a.startDate||'2100-01-01').getTime() - new Date(b.startDate||'2100-01-01').getTime())
  const nextTrip = upcomingTrips[0]
  const nextTripPacking = nextTrip ? packing.filter(p => p.tripId === nextTrip.id) : []
  const packedCount = nextTripPacking.filter(p => p.packed).length

  // Documents recent
  const recentDocs = documents.slice().sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0,5)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Family Dashboard</h1>
        <div className="mt-2 flex gap-2 items-center">
          <label className="text-sm text-muted">Filter:</label>
          <select className="px-3 py-1.5 rounded border border-theme surface" value={memberFilter} onChange={e=>setMemberFilter(e.target.value)}>
            <option value="all">All members</option>
            {members.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="ml-auto flex flex-wrap gap-2 text-sm p-1 rounded border border-theme surface">
            <WidgetToggle label="Today" value={prefs.showToday} onChange={(v)=>setPrefs(p=>({ ...p, showToday: v }))} />
            <WidgetToggle label="Announcements" value={prefs.showAnnouncements} onChange={(v)=>setPrefs(p=>({ ...p, showAnnouncements: v }))} />
            <WidgetToggle label="Calendar" value={prefs.showCalendarPreview} onChange={(v)=>setPrefs(p=>({ ...p, showCalendarPreview: v }))} />
            <WidgetToggle label="Shopping" value={prefs.showShoppingSnapshot} onChange={(v)=>setPrefs(p=>({ ...p, showShoppingSnapshot: v }))} />
            <WidgetToggle label="Chores" value={prefs.showChoreChart} onChange={(v)=>setPrefs(p=>({ ...p, showChoreChart: v }))} />
            <WidgetToggle label="Activity" value={prefs.showActivityFeed} onChange={(v)=>setPrefs(p=>({ ...p, showActivityFeed: v }))} />
            <WidgetToggle label="Tasks" value={prefs.showTasksWidget} onChange={(v)=>setPrefs(p=>({ ...p, showTasksWidget: v }))} />
            <WidgetToggle label="Budget" value={prefs.showBudgetWidget} onChange={(v)=>setPrefs(p=>({ ...p, showBudgetWidget: v }))} />
            <WidgetToggle label="Travel" value={prefs.showTravelWidget} onChange={(v)=>setPrefs(p=>({ ...p, showTravelWidget: v }))} />
            <WidgetToggle label="Documents" value={prefs.showDocumentsWidget} onChange={(v)=>setPrefs(p=>({ ...p, showDocumentsWidget: v }))} />
          </div>
        </div>
      </div>

      {prefs.showAnnouncements && (
        <div className="border border-yellow-200 dark:border-yellow-800 rounded bg-yellow-50 dark:bg-yellow-900/30 p-3">
          <div className="flex items-center justify-between">
            <div>
              {announcements.length === 0 ? (
                <div className="text-sm text-gray-700 dark:text-gray-200">No announcements. Add one below.</div>
              ) : (
                <ul className="text-sm space-y-1">
                  {announcements.slice().reverse().map(a => (
                    <li key={a.id} className={`flex items-center gap-2 ${a.urgent? 'font-medium text-red-700 dark:text-red-300':''}`}>
                      {a.urgent && <span className="inline-block w-2 h-2 rounded bg-red-600" />}
                      {a.text}
                      <span className="ml-auto text-xs text-gray-700 dark:text-gray-300">{format(new Date(a.createdAt), 'MMM d, HH:mm')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <AnnouncementForm onAdd={(text, urgent)=>addAnnouncement(text, urgent)} />
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prefs.showToday && (
          <Card title="Today">
            <ul className="text-sm space-y-1">
              <li>Events: {eventsToday.length}</li>
              <li>Open tasks: {tasksDue.length}</li>
              <li>Active lists: {lists.length}</li>
              <li>Upcoming trips: {trips.length}</li>
            </ul>
            <div className="mt-3 flex gap-2 text-xs">
              <Link to="/calendar" className="px-2 py-1 rounded border border-theme text-theme">Open Calendar</Link>
              <Link to="/tasks" className="px-2 py-1 rounded border border-theme text-theme">Open Tasks</Link>
              <Link to="/shopping" className="px-2 py-1 rounded border border-theme text-theme">Open Shopping</Link>
            </div>
          </Card>
        )}

        {prefs.showCalendarPreview && (
          <Card title="Upcoming (7 days)">
            {upcoming7Days.length === 0 ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">No upcoming events.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {upcoming7Days.map(e => (
                  <li key={e.id} className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded bg-indigo-500" />
                    {format(new Date(e.date), 'EEE, MMM d')}: {e.title}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {prefs.showShoppingSnapshot && (
          <Card title="Shopping Snapshot">
            {!activeList ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">No lists yet.</p>
            ) : (
              <div>
                <div className="text-sm mb-2">{activeList.name} — {activeList.items.filter(i=>i.checked).length}/{activeList.items.length} done</div>
                <ul className="text-sm space-y-1">
                  {remainingItems.map(i => (
                    <li key={i.id}>{i.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {prefs.showChoreChart && (
          <Card title="Chore Chart">
            <ul className="text-sm space-y-1">
              {choreChart.map(row => (
                <li key={row.id} className="flex items-center gap-2">
                  <span className="w-24 text-gray-700 dark:text-gray-200">{members.find(m=>m.id===row.id)?.name}</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-2 rounded">
                    <div className="bg-green-500 h-2 rounded" style={{ width: `${Math.min(100, row.count * 20)}%` }} />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">{row.count} open</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {prefs.showActivityFeed && (
          <Card title="Activity Feed">
            {activity.length === 0 ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">No recent activity.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {activity.slice(-10).reverse().map(a => (
                  <li key={a.id} className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded bg-gray-400" />
                    {a.message}
                    <span className="ml-auto text-xs text-gray-700 dark:text-gray-300">{format(new Date(a.createdAt), 'MMM d, HH:mm')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {prefs.showTasksWidget && (
          <Card title="Tasks & Chores">
            {tasksDue.length === 0 ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">No open tasks.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {tasksDue.slice(0,6).map(t => (
                  <li key={t.id} className="flex items-center gap-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" onChange={()=>toggleTask(t.id)} />
                      {t.title}
                    </label>
                    {t.dueDate && <span className="ml-auto text-xs text-gray-700 dark:text-gray-300">due {format(new Date(t.dueDate), 'MMM d')}</span>}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 text-xs">
              <Link to="/tasks" className="px-2 py-1 rounded border border-theme text-theme">Open Tasks</Link>
            </div>
          </Card>
        )}

        {prefs.showBudgetWidget && (
          <Card title="Budget Summary">
            <div className="text-sm">This month: <span className="font-medium">{monthTotal.toFixed(2)}</span> {monthBudgets[0]?.currency || ''}</div>
            {monthBudgets.length === 0 ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">No budget entries for this month.</p>
            ) : (
              <ul className="text-sm space-y-1 mt-2">
                {monthBudgets.slice(0,5).map(b => (
                  <li key={b.id} className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded bg-green-500" />
                    {b.category}: {b.amount} {b.currency}
                    <span className="ml-auto text-xs text-gray-700 dark:text-gray-300">{format(new Date(b.date), 'MMM d')}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 text-xs">
              <Link to="/budget" className="px-2 py-1 rounded border border-theme text-theme">Open Budget</Link>
            </div>
          </Card>
        )}

        {prefs.showTravelWidget && (
          <Card title="Travel Overview">
            {!nextTrip ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">No upcoming trips.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="font-medium">{nextTrip.title}{nextTrip.destination ? ` — ${nextTrip.destination}` : ''}</div>
                <div>{nextTrip.startDate && format(new Date(nextTrip.startDate), 'MMM d')} - {nextTrip.endDate && format(new Date(nextTrip.endDate), 'MMM d')}</div>
                <div>Packing: {packedCount}/{nextTripPacking.length} packed</div>
              </div>
            )}
            <div className="mt-3 text-xs">
              <Link to="/travel" className="px-2 py-1 rounded border border-theme text-theme">Open Travel</Link>
            </div>
          </Card>
        )}

        {prefs.showDocumentsWidget && (
          <Card title="Documents">
            {recentDocs.length === 0 ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">No documents yet.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {recentDocs.map(d => (
                  <li key={d.id} className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded bg-blue-500" />
                    {d.name}
                    <span className="ml-auto text-xs text-gray-700 dark:text-gray-300">{format(new Date(d.createdAt), 'MMM d, HH:mm')}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 text-xs">
              <Link to="/documents" className="px-2 py-1 rounded border border-theme text-theme">Open Documents</Link>
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}

function Card({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="p-4 border border-theme rounded card shadow-sm">
      <h2 className="font-medium mb-2">{title}</h2>
      {children}
    </div>
  )
}

function WidgetToggle({ label, value, onChange }: { label: string, value: boolean, onChange: (v:boolean)=>void }) {
  return (
    <button
      type="button"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={`px-2 py-1 rounded border text-sm transition-colors
        ${value
            ? 'bg-accent text-white border-accent'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700'}
      `}
    >
      {label}
    </button>
  )
}

function AnnouncementForm({ onAdd }: { onAdd: (text: string, urgent?: boolean) => void }) {
  const [text, setText] = useState('')
  const [urgent, setUrgent] = useState(false)
  return (
    <form className="mt-3 flex gap-2" onSubmit={(e)=>{e.preventDefault(); if(!text.trim()) return; onAdd(text, urgent); setText(''); setUrgent(false)}}>
      <input className="flex-1 px-3 py-2 rounded border border-theme surface" placeholder="Add announcement" value={text} onChange={e=>setText(e.target.value)} />
      <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={urgent} onChange={e=>setUrgent(e.target.checked)} /> Urgent</label>
        <button className="px-3 py-2 rounded btn-primary">Post</button>
    </form>
  )
}
  // Budget summary (current month)