import { useStore } from '../store'
import { useMemo, useState } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'

export default function Shopping() {
  const { lists, addList, addItemToList, toggleItem, mealPlans, addMealPlan, updateMealPlan, removeMealPlan, pantry, addPantryItem } = useStore()
  const [listName, setListName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [activeListId, setActiveListId] = useState<string | undefined>(lists[0]?.id)
  // Weekly planner state
  const [pantryName, setPantryName] = useState('')
  const [pantryQty, setPantryQty] = useState<number | ''>('')
  const [pantryUnit, setPantryUnit] = useState('')
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i)), [selectedWeekStart])
  const mealTypes = ['breakfast','lunch','dinner','snack'] as const
  const keyForCell = (iso: string, mt: typeof mealTypes[number]) => `${iso}|${mt}`
  const [openCell, setOpenCell] = useState<Record<string, boolean>>({})
  const [cellData, setCellData] = useState<Record<string, { title: string; serves?: number; notes?: string }>>({})
  const plansByCell = useMemo(() => {
    const map: Record<string, ReturnType<typeof getPlans>> = {}
    weekDays.forEach(d => {
      const iso = format(d, 'yyyy-MM-dd')
      mealTypes.forEach(mt => {
        map[keyForCell(iso, mt)] = getPlans(mealPlans, iso, mt)
      })
    })
    return map
  }, [mealPlans, weekDays])

  function getPlans(all: typeof mealPlans, iso: string, mt: typeof mealTypes[number]) {
    return all.filter(mp => mp.date === iso && mp.mealType === mt)
  }
  function toggleCell(iso: string, mt: typeof mealTypes[number]) {
    const k = keyForCell(iso, mt)
    setOpenCell(prev => ({ ...prev, [k]: !prev[k] }))
    setCellData(prev => ({ ...prev, [k]: prev[k] || { title: '', serves: undefined, notes: '' } }))
  }
  function saveCell(iso: string, mt: typeof mealTypes[number]) {
    const k = keyForCell(iso, mt)
    const data = cellData[k]
    if (!data || !data.title.trim()) return
    addMealPlan({ date: iso, mealType: mt, title: data.title.trim(), notes: data.notes, serves: data.serves })
    setOpenCell(prev => ({ ...prev, [k]: false }))
    setCellData(prev => ({ ...prev, [k]: { title: '', serves: undefined, notes: '' } }))
  }
  function clearWeek() {
    const weekIsos = weekDays.map(d => format(d, 'yyyy-MM-dd'))
    mealPlans.filter(mp => weekIsos.includes(mp.date)).forEach(mp => removeMealPlan(mp.id))
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><IconCart /> Shopping & Meal Planning</h1>
      <form className="flex gap-2" onSubmit={(e)=>{e.preventDefault(); if(!listName.trim()) return; addList(listName); setListName('')}}>
        <input className="flex-1 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="New list" value={listName} onChange={e=>setListName(e.target.value)} />
            <button className="px-3 py-2 rounded btn-primary">Create List</button>
      </form>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconList /> Lists</h2>
          <ul className="space-y-2">
            {lists.map(l => (
              <li key={l.id} className={`p-2 rounded border cursor-pointer ${activeListId===l.id? 'bg-gray-100 dark:bg-gray-700':''}`} onClick={()=>setActiveListId(l.id)}>
                {l.name} <span className="text-xs text-gray-500">({l.items.length} items)</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconBox /> Items</h2>
          {activeListId ? (
            <>
              <form className="flex gap-2 mb-2" onSubmit={(e)=>{e.preventDefault(); if(!newItemName.trim()) return; addItemToList(activeListId!, { name: newItemName }); setNewItemName('')}}>
                <input className="flex-1 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Add item" value={newItemName} onChange={e=>setNewItemName(e.target.value)} />
                <button className="px-3 py-2 rounded btn-primary">Add</button>
              </form>
              <ul className="space-y-2">
                {lists.find(l=>l.id===activeListId)?.items.map(it => (
                  <li key={it.id} className="p-2 border rounded flex items-center gap-2">
                    <input type="checkbox" checked={it.checked} onChange={()=>toggleItem(activeListId!, it.id)} />
                    <span className={it.checked? 'line-through text-gray-500':''}>{it.name}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="text-sm text-gray-500">Select a list to manage items.</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium flex items-center gap-2"><IconMeal /> Weekly Meal Planner</h2>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded border" onClick={()=>setSelectedWeekStart(addDays(selectedWeekStart, -7))}>Prev</button>
              <div className="text-sm">Week of {format(selectedWeekStart, 'dd MMM yyyy')}</div>
              <button className="px-3 py-1 rounded border" onClick={()=>setSelectedWeekStart(addDays(selectedWeekStart, 7))}>Next</button>
              <button className="px-3 py-1 rounded border text-red-600" onClick={clearWeek}>Clear Week</button>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full table-fixed border-collapse">
              <thead>
                <tr>
                  <th className="w-28 p-2 text-left text-xs text-gray-600">Meal</th>
                  {weekDays.map((d) => (
                    <th key={format(d,'yyyy-MM-dd')} className="p-2 text-left text-xs text-gray-600 border-b">{format(d,'EEE dd')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mealTypes.map((mt) => (
                  <tr key={mt} className="align-top">
                    <td className="p-2 text-xs capitalize text-gray-700 border-b bg-gray-50 dark:bg-gray-700">{mt}</td>
                    {weekDays.map((d) => {
                      const iso = format(d,'yyyy-MM-dd')
                      const k = keyForCell(iso, mt)
                      const items = plansByCell[k] || []
                      const form = cellData[k] || { title: '', serves: undefined, notes: '' }
                      return (
                        <td key={k} className="p-2 border-b">
                          <ul className="space-y-1 mb-2">
                            {items.map(mp => (
                              <MealPlanItem key={mp.id} mp={mp} onUpdate={(patch)=>updateMealPlan(mp.id, patch)} onRemove={()=>removeMealPlan(mp.id)} />
                            ))}
                            {items.length===0 && <li className="text-xs text-gray-500">No plan</li>}
                          </ul>
                          {openCell[k] ? (
                            <form className="grid grid-cols-[1fr_auto] gap-2" onSubmit={(e)=>{e.preventDefault(); saveCell(iso, mt)}}>
                              <input className="px-2 py-1 rounded border bg-white dark:bg-gray-900 text-xs" placeholder={`Add ${mt}`} value={form.title} onChange={e=>setCellData(prev=>({ ...prev, [k]: { ...form, title: e.target.value } }))} />
                              <div className="grid grid-cols-3 gap-2 col-span-2">
                                <input type="number" min={1} className="px-2 py-1 rounded border bg-white dark:bg-gray-900 text-xs" placeholder="Serves" value={typeof form.serves==='number'?form.serves:''} onChange={e=>setCellData(prev=>({ ...prev, [k]: { ...form, serves: e.target.value?parseInt(e.target.value):undefined } }))} />
                                <input className="px-2 py-1 rounded border bg-white dark:bg-gray-900 text-xs col-span-2" placeholder="Notes" value={form.notes||''} onChange={e=>setCellData(prev=>({ ...prev, [k]: { ...form, notes: e.target.value } }))} />
                              </div>
                              <div className="flex items-center gap-2">
                                <button className="px-2 py-1 rounded btn-primary text-xs">Save</button>
                                <button type="button" className="px-2 py-1 rounded border text-xs" onClick={()=>toggleCell(iso, mt)}>Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <button className="px-2 py-1 rounded border text-xs" onClick={()=>toggleCell(iso, mt)}>Add</button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconPantry /> Pantry</h2>
          <form className="grid md:grid-cols-4 gap-2 mb-2" onSubmit={(e)=>{e.preventDefault(); if(!pantryName.trim()) return; addPantryItem({ name: pantryName, qty: typeof pantryQty==='number'?pantryQty:undefined, unit: pantryUnit }); setPantryName(''); setPantryQty(''); setPantryUnit('')}}>
            <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Item" value={pantryName} onChange={e=>setPantryName(e.target.value)} />
            <input type="number" min={0} step="0.01" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Qty" value={pantryQty} onChange={e=>setPantryQty(e.target.value?parseFloat(e.target.value):'')} />
            <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Unit" value={pantryUnit} onChange={e=>setPantryUnit(e.target.value)} />
             <button className="px-3 py-2 rounded btn-primary">Add</button>
          </form>
          <ul className="space-y-2">
            {pantry.map(p => (
              <li key={p.id} className="p-2 border rounded flex items-center justify-between">
                <div className="text-sm">{p.name} {p.qty?`• ${p.qty}${p.unit??''}`:''}</div>
              </li>
            ))}
            {pantry.length === 0 && <li className="py-1 text-sm text-gray-500">No pantry items yet</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

function MealPlanItem({ mp, onUpdate, onRemove }: { mp: any; onUpdate: (patch: any)=>void; onRemove: ()=>void }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(mp.title || '')
  const [serves, setServes] = useState<number | ''>(typeof mp.serves==='number'?mp.serves:'')
  const [notes, setNotes] = useState(mp.notes || '')
  function save() {
    const patch: any = { title: title.trim() }
    if (typeof serves === 'number') patch.serves = serves
    patch.notes = notes
    onUpdate(patch)
    setEditing(false)
  }
  if (!editing) {
    return (
      <li className="text-sm flex items-center justify-between">
        <span>{mp.title}{typeof mp.serves==='number'?` • serves ${mp.serves}`:''}{mp.notes?` • ${mp.notes}`:''}</span>
        <div className="flex items-center gap-2">
          <button className="text-xs" onClick={()=>setEditing(true)}>Edit</button>
          <button className="text-xs text-red-600" onClick={onRemove}>Remove</button>
        </div>
      </li>
    )
  }
  return (
    <li className="space-y-1">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input className="px-2 py-1 rounded border bg-white dark:bg-gray-900 text-xs" value={title} onChange={e=>setTitle(e.target.value)} />
        <input type="number" min={1} className="px-2 py-1 rounded border bg-white dark:bg-gray-900 text-xs" placeholder="Serves" value={serves} onChange={e=>setServes(e.target.value?parseInt(e.target.value):'')} />
      </div>
      <input className="px-2 py-1 rounded border bg-white dark:bg-gray-900 text-xs w-full" placeholder="Notes" value={notes} onChange={e=>setNotes(e.target.value)} />
      <div className="flex items-center gap-2">
        <button className="px-2 py-1 rounded btn-primary text-xs" onClick={save}>Save</button>
        <button className="px-2 py-1 rounded border text-xs" onClick={()=>setEditing(false)}>Cancel</button>
      </div>
    </li>
  )
}

function IconCart(){return(<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4h-2l-1 2H1v2h2l3.6 7.59L5 18a2 2 0 002 2h12v-2H7.42l1.1-2H19a1 1 0 00.92-.62l3-7A1 1 0 0022 6H6.21l.94-2H7z"/></svg>)}
function IconList(){return(<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/></svg>)}
function IconBox(){return(<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4v6l-9 4-9-4v-6z"/></svg>)}
function IconMeal(){return(<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h2v10a3 3 0 11-2 0V2zm10 0h2v14h-2V2zM4 20h16v2H4v-2z"/></svg>)}
function IconPantry(){return(<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h16v2H4V3zm2 4h12v12H6V7zm2 2v8h8V9H8z"/></svg>)}