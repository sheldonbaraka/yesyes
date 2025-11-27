import { useStore } from '../store'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { useState } from 'react'

export default function Calendar() {
  const { events, members, categories, addEvent } = useStore()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [memberId, setMemberId] = useState<string | undefined>(members[0]?.id)
  const [categoryId, setCategoryId] = useState<string | undefined>(categories[0]?.id)

  const monthStart = startOfMonth(new Date(date))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Shared Calendar</h1>
      <form
        className="grid md:grid-cols-5 gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          addEvent({ title, date, memberId, categoryId })
          setTitle('')
        }}
      >
        <div className="md:col-span-2">
          <label className="block text-sm">Title</label>
          <input className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={title} onChange={e=>setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Date</label>
          <input type="date" className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={date} onChange={e=>setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Person</label>
          <select className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={memberId} onChange={e=>setMemberId(e.target.value)}>
            {members.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Category</label>
          <select className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
            {categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="px-3 py-2 rounded btn-primary">Add Event</button>
      </form>

      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const dayEvents = events.filter((e) => isSameDay(new Date(e.date), d))
          return (
            <div key={d.toISOString()} className="border rounded p-2 bg-white dark:bg-gray-800">
              <div className="text-xs font-medium">{format(d, 'MMM d')}</div>
              <ul className="mt-1 space-y-1">
                {dayEvents.map((e) => {
                  const cat = categories.find((c) => c.id === e.categoryId)
                  return (
                    <li key={e.id} className="text-xs flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded" style={{ background: cat?.color || '#6366f1' }} />
                      {e.title}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}