import { useStore } from '../store'
import { useMemo, useState } from 'react'
import { format } from 'date-fns'

export default function Travel() {
  const { trips, itinerary, packing, addTrip, addItineraryItem, addPackingItem, togglePacked, members, addBudgetEntry, budgets } = useStore()
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [activeTrip, setActiveTrip] = useState<string | undefined>(trips[0]?.id)
  const packingForActive = useMemo(() => packing.filter(p=>p.tripId===activeTrip), [packing, activeTrip])
  const packedCount = packingForActive.filter(p=>p.packed).length
  const budgetForActive = useMemo(() => budgets.filter(b=>b.tripId===activeTrip), [budgets, activeTrip])
  const totalBudget = budgetForActive.reduce((sum,b)=> sum + (b.amount || 0), 0)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><IconPlane /> Travel Planning</h1>
      <form className="grid md:grid-cols-5 gap-2 items-end" onSubmit={(e)=>{e.preventDefault(); if(!title.trim()) return; addTrip({ title, destination, startDate, endDate }); setTitle('');}}>
        <div className="md:col-span-2">
          <label className="block text-sm">Trip Title</label>
          <input className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={title} onChange={e=>setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Destination</label>
          <input className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={destination} onChange={e=>setDestination(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Start</label>
          <input type="date" className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={startDate} onChange={e=>setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">End</label>
          <input type="date" className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={endDate} onChange={e=>setEndDate(e.target.value)} />
        </div>
          <button className="px-3 py-2 rounded btn-primary">Create Trip</button>
      </form>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconList /> Trips</h2>
          <ul className="space-y-2">
            {trips.map(t => (
              <li key={t.id} className={`p-2 rounded border cursor-pointer ${activeTrip===t.id? 'bg-gray-100 dark:bg-gray-700':''}`} onClick={()=>setActiveTrip(t.id)}>
                {t.title} <span className="text-xs text-gray-500">{t.destination}</span>
              </li>
            ))}
          </ul>
          {activeTrip && (
            <div className="mt-3 text-xs text-gray-600">
              <div>Packing: {packedCount}/{packingForActive.length} packed</div>
              <div>Total Budget: {totalBudget.toFixed(2)} USD</div>
            </div>
          )}
        </div>
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconCalendar /> Itinerary</h2>
          {activeTrip ? <ItineraryEditor tripId={activeTrip} addItineraryItem={addItineraryItem} itinerary={itinerary.filter(i=>i.tripId===activeTrip)} /> : <p className="text-sm text-gray-500">Select a trip.</p>}
        </div>
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconSuitcase /> Packing</h2>
          {activeTrip ? <PackingEditor tripId={activeTrip} addPackingItem={addPackingItem} togglePacked={togglePacked} members={members} packing={packing.filter(p=>p.tripId===activeTrip)} /> : <p className="text-sm text-gray-500">Select a trip.</p>}
          {activeTrip && <BudgetQuickAdd tripId={activeTrip} addBudgetEntry={addBudgetEntry} />}
        </div>
      </div>
    </div>
  )
}

function ItineraryEditor({ tripId, addItineraryItem, itinerary }: { tripId: string, addItineraryItem: (i: any)=>void, itinerary: any[] }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'flight'|'train'|'activity'|'hotel'|'car'>('activity')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  return (
    <div>
      <form className="flex gap-2 mb-2" onSubmit={(e)=>{e.preventDefault(); if(!title.trim()) return; addItineraryItem({ tripId, title, type, date }); setTitle('')}}>
        <input className="flex-1 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Add itinerary item" value={title} onChange={e=>setTitle(e.target.value)} />
        <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={type} onChange={e=>setType(e.target.value as any)}>
          <option value="activity">Activity</option>
          <option value="flight">Flight</option>
          <option value="train">Train</option>
          <option value="hotel">Hotel</option>
          <option value="car">Car</option>
        </select>
        <input type="date" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={date} onChange={e=>setDate(e.target.value)} />
            <button className="px-3 py-2 rounded btn-primary">Add</button>
      </form>
      <ul className="space-y-2">
        {itinerary.map(i => (
          <li key={i.id} className="p-2 border rounded">
            <span className="text-xs text-gray-500">{i.type}</span> {i.title} — {i.date}
          </li>
        ))}
      </ul>
    </div>
  )
}

function BudgetQuickAdd({ tripId, addBudgetEntry }: { tripId: string; addBudgetEntry: (b: any) => void }) {
  const [category, setCategory] = useState('Transport')
  const [amount, setAmount] = useState<number | ''>('')
  const [currency, setCurrency] = useState('USD')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  function add() {
    if (!category.trim() || typeof amount !== 'number') return
    addBudgetEntry({ tripId, category, amount, currency, date })
    setCategory('Transport'); setAmount('')
  }
  return (
    <div className="mt-3 p-3 border rounded bg-gray-50 dark:bg-gray-700">
      <div className="text-sm font-medium mb-2 flex items-center gap-2"><IconWallet /> Quick Budget</div>
      <form className="grid md:grid-cols-5 gap-2 items-end" onSubmit={(e)=>{e.preventDefault(); add()}}>
        <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Category" value={category} onChange={e=>setCategory(e.target.value)} />
        <input type="number" min={0} step="0.01" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value ? parseFloat(e.target.value) : '')} />
        <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={currency} onChange={e=>setCurrency(e.target.value)}>
          {['USD','EUR','GBP'].map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={date} onChange={e=>setDate(e.target.value)} />
            <button className="px-3 py-2 rounded btn-primary">Add</button>
      </form>
    </div>
  )
}

function IconPlane() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 16l20-6-7 8-3-1-2 3-2-1 2-3-3-1z"/></svg>) }
function IconList() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/></svg>) }
function IconCalendar() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h2v2h6V2h2v2h3v16H4V4h3V2zm0 6h10v2H7V8z"/></svg>) }
function IconSuitcase() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6v3h5v14H4V6h5V3zm2 3h2V5h-2v1z"/></svg>) }
function IconWallet() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7h18a2 2 0 012 2v8a2 2 0 01-2 2H2V7zm2 2v8h16V9H4zm10 3h4v2h-4v-2z"/></svg>) }

function PackingEditor({ tripId, addPackingItem, togglePacked, members, packing }: { tripId: string, addPackingItem: (p:any)=>void, togglePacked: (id:string)=>void, members: any[], packing:any[] }) {
  const [name, setName] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | undefined>(members[0]?.id)
  return (
    <div>
      <form className="flex gap-2 mb-2" onSubmit={(e)=>{e.preventDefault(); if(!name.trim()) return; addPackingItem({ tripId, name, assigneeId }); setName('')}}>
        <input className="flex-1 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Add packing item" value={name} onChange={e=>setName(e.target.value)} />
        <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={assigneeId} onChange={e=>setAssigneeId(e.target.value)}>
          {members.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
            <button className="px-3 py-2 rounded btn-primary">Add</button>
      </form>
      <ul className="space-y-2">
        {packing.map(p => (
          <li key={p.id} className="p-2 border rounded flex items-center gap-2">
            <input type="checkbox" checked={p.packed} onChange={()=>togglePacked(p.id)} />
            <span className={p.packed? 'line-through text-gray-500':''}>{p.name}</span>
            <span className="ml-auto text-xs text-gray-500">{members.find(m=>m.id===p.assigneeId)?.name ?? 'Unassigned'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}