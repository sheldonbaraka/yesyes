import { useStore } from '../store'
import { useState } from 'react'

export default function Tasks() {
  const { tasks, members, addTask, toggleTask } = useStore()
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | undefined>(members[0]?.id)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tasks & Chores</h1>
      <form className="flex gap-2" onSubmit={(e)=>{e.preventDefault(); if(!title.trim()) return; addTask({ title, assigneeId }); setTitle('')}}>
        <input className="flex-1 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Add a task" value={title} onChange={e=>setTitle(e.target.value)} />
        <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={assigneeId} onChange={e=>setAssigneeId(e.target.value)}>
          {members.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button className="px-3 py-2 rounded btn-primary">Add</button>
      </form>
      <ul className="space-y-2">
        {tasks.map(t => (
          <li key={t.id} className="p-3 border rounded bg-white dark:bg-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={t.completed} onChange={()=>toggleTask(t.id)} />
              <span className={t.completed ? 'line-through text-gray-500' : ''}>{t.title}</span>
            </div>
            <div className="text-xs text-gray-500">{members.find(m=>m.id===t.assigneeId)?.name ?? 'Unassigned'}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}