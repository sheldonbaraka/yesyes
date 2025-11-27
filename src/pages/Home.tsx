import { useEffect, useMemo, useState } from 'react'

type MaintenanceItem = { id: string; asset: string; frequencyMonths: number; lastServiced?: string }
type WarrantyItem = { id: string; product: string; expires: string }
type InventoryItem = { id: string; name: string; category?: string; qty?: number }
type ProviderItem = { id: string; name: string; type: string; phone?: string; rating?: number }

const KEY_MAINT = 'ufp-home-maint'
const KEY_WARR = 'ufp-home-warranties'
const KEY_INVENT = 'ufp-home-inventory'
const KEY_PROV = 'ufp-home-providers'

export default function HomeManagement() {
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>(() => load(KEY_MAINT, []))
  const [warranties, setWarranties] = useState<WarrantyItem[]>(() => load(KEY_WARR, []))
  const [inventory, setInventory] = useState<InventoryItem[]>(() => load(KEY_INVENT, []))
  const [providers, setProviders] = useState<ProviderItem[]>(() => load(KEY_PROV, []))

  useEffect(() => { save(KEY_MAINT, maintenance) }, [maintenance])
  useEffect(() => { save(KEY_WARR, warranties) }, [warranties])
  useEffect(() => { save(KEY_INVENT, inventory) }, [inventory])
  useEffect(() => { save(KEY_PROV, providers) }, [providers])

  const [asset, setAsset] = useState('')
  const [freq, setFreq] = useState(6)
  const [last, setLast] = useState('')
  function addMaintenance() {
    const a = asset.trim()
    if (!a) return
    setMaintenance(m => [...m, { id: cryptoId(), asset: a, frequencyMonths: freq, lastServiced: last || undefined }])
    setAsset(''); setFreq(6); setLast('')
  }

  const [product, setProduct] = useState('')
  const [expires, setExpires] = useState('')
  function addWarranty() {
    const p = product.trim(); const e = expires.trim()
    if (!p || !e) return
    setWarranties(ws => [...ws, { id: cryptoId(), product: p, expires: e }])
    setProduct(''); setExpires('')
  }

  const [invName, setInvName] = useState('')
  const [invCat, setInvCat] = useState('')
  const [invQty, setInvQty] = useState<number | ''>('')
  function addInventory() {
    const n = invName.trim()
    if (!n) return
    setInventory(inv => [...inv, { id: cryptoId(), name: n, category: invCat.trim() || undefined, qty: typeof invQty === 'number' ? invQty : undefined }])
    setInvName(''); setInvCat(''); setInvQty('')
  }

  const [provName, setProvName] = useState('')
  const [provType, setProvType] = useState('Plumber')
  const [provPhone, setProvPhone] = useState('')
  const [provRating, setProvRating] = useState<number | ''>('')
  function addProvider() {
    const n = provName.trim()
    if (!n) return
    setProviders(ps => [...ps, { id: cryptoId(), name: n, type: provType, phone: provPhone.trim() || undefined, rating: typeof provRating === 'number' ? provRating : undefined }])
    setProvName(''); setProvPhone(''); setProvRating('')
  }

  const dueSoon = useMemo(() => {
    const now = new Date()
    return maintenance.map(m => ({ m, next: nextDue(m) }))
      .filter(({ next }) => next && (next.getTime() - now.getTime()) < 1000*60*60*24*30) // within 30 days
      .map(({ m }) => m.id)
  }, [maintenance])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><IconHome /> Home Management</h1>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Maintenance */}
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium flex items-center gap-2"><IconWrench /> Maintenance Scheduler</div>
            <div className="text-xs text-gray-500">Due soon: {dueSoon.length}</div>
          </div>
          <form className="grid md:grid-cols-4 gap-2 mb-3" onSubmit={(e)=>{e.preventDefault(); addMaintenance()}}>
            <input className="md:col-span-2 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Asset (HVAC, Roof, etc.)" value={asset} onChange={e=>setAsset(e.target.value)} />
            <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={freq} onChange={e=>setFreq(parseInt(e.target.value))}>
              {[3,6,12,24].map(m=> <option key={m} value={m}>{m} mo</option>)}
            </select>
            <input type="date" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={last} onChange={e=>setLast(e.target.value)} />
            <button className="md:col-span-4 px-3 py-2 rounded btn-primary">Add</button>
          </form>
          <ul className="space-y-2">
            {maintenance.map(m => {
              const next = nextDue(m)
              const soon = next && dueSoon.includes(m.id)
              return (
                <li key={m.id} className={`p-2 border rounded flex items-center gap-2 ${soon ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900' : ''}`}>
                  <span className="text-sm font-medium">{m.asset}</span>
                  <span className="ml-auto text-xs text-gray-500">Every {m.frequencyMonths} mo • Next: {next ? next.toLocaleDateString() : 'n/a'}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Warranties */}
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <div className="font-medium mb-2 flex items-center gap-2"><IconShield /> Warranties Vault</div>
          <form className="grid md:grid-cols-3 gap-2 mb-3" onSubmit={(e)=>{e.preventDefault(); addWarranty()}}>
            <input className="md:col-span-2 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Product/Appliance" value={product} onChange={e=>setProduct(e.target.value)} />
            <input type="date" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={expires} onChange={e=>setExpires(e.target.value)} />
            <button className="md:col-span-3 px-3 py-2 rounded bg-green-600 text-white">Add Warranty</button>
          </form>
          <ul className="space-y-2">
            {warranties.map(w => (
              <li key={w.id} className="p-2 border rounded flex items-center gap-2">
                <span className="text-sm font-medium">{w.product}</span>
                <span className="ml-auto text-xs text-gray-500">Expires {new Date(w.expires).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Inventory */}
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <div className="font-medium mb-2 flex items-center gap-2"><IconHome /> Home Inventory</div>
          <form className="grid md:grid-cols-4 gap-2 mb-3" onSubmit={(e)=>{e.preventDefault(); addInventory()}}>
            <input className="md:col-span-2 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Item name" value={invName} onChange={e=>setInvName(e.target.value)} />
            <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Category" value={invCat} onChange={e=>setInvCat(e.target.value)} />
            <input type="number" min={0} className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Qty" value={invQty} onChange={e=>setInvQty(e.target.value ? parseInt(e.target.value) : '')} />
            <button className="md:col-span-4 px-3 py-2 rounded btn-primary">Add Item</button>
          </form>
          <ul className="space-y-2">
            {inventory.map(i => (
              <li key={i.id} className="p-2 border rounded flex items-center gap-2">
                <span className="text-sm font-medium">{i.name}</span>
                {i.category && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{i.category}</span>}
                {typeof i.qty === 'number' && <span className="ml-auto text-xs text-gray-500">Qty: {i.qty}</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* Providers */}
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <div className="font-medium mb-2 flex items-center gap-2"><IconPhone /> Service Providers</div>
          <form className="grid md:grid-cols-5 gap-2 mb-3" onSubmit={(e)=>{e.preventDefault(); addProvider()}}>
            <input className="md:col-span-2 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Provider name" value={provName} onChange={e=>setProvName(e.target.value)} />
            <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={provType} onChange={e=>setProvType(e.target.value)}>
              {['Plumber','Electrician','HVAC','Landscaping','Cleaning','General'].map(t=> <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Phone" value={provPhone} onChange={e=>setProvPhone(e.target.value)} />
            <input type="number" min={1} max={5} className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Rating (1-5)" value={provRating} onChange={e=>setProvRating(e.target.value ? parseInt(e.target.value) : '')} />
            <button className="md:col-span-5 px-3 py-2 rounded bg-green-600 text-white">Add Provider</button>
          </form>
          <ul className="space-y-2">
            {providers.map(p => (
              <li key={p.id} className="p-2 border rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{p.type}</span>
                  {typeof p.rating === 'number' && <span className="text-xs text-yellow-600">{'★'.repeat(Math.max(1, Math.min(5, p.rating)))}{p.rating < 5 ? '☆'.repeat(5 - Math.max(1, Math.min(5, p.rating))) : ''}</span>}
                  <span className="ml-auto text-xs text-gray-500">{p.phone || 'No phone'}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function load<T>(key: string, def: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def } catch { return def }
}
function save(key: string, val: any) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}
function cryptoId() { return Math.random().toString(36).slice(2) }
function nextDue(m: MaintenanceItem) {
  if (!m.lastServiced) return undefined
  const dt = new Date(m.lastServiced)
  const next = new Date(dt)
  next.setMonth(next.getMonth() + m.frequencyMonths)
  return next
}

function IconHome() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z"/></svg>
  )
}
function IconWrench() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22 7a5 5 0 01-6.7 4.7L6 21H3v-3l9.3-9.3A5 5 0 117 2l3 3 2-2 2 2-2 2 3 3A5 5 0 0122 7z"/></svg>
  )
}
function IconShield() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 4v6c0 5-3.4 9.3-8 10-4.6-.7-8-5-8-10V6l8-4z"/></svg>
  )
}
function IconPhone() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011 .2l3.4 3.4a1 1 0 01.2 1A3 3 0 0118 22a16 16 0 01-14-14 3 3 0 012.2-2.6 1 1 0 011 .2l3.4 3.4a1 1 0 01.2 1L6.6 10.8z"/></svg>
  )
}