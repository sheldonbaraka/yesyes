import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { initiateMpesaDeposit, initiateMpesaWithdraw, initiateCardDeposit, paymentsDemo, type PaymentResult } from '../payments'

function isoDate(y: number, m: number, d: number) {
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

function ageFromDob(dobIso: string) {
  const dob = new Date(dobIso)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const hasHadBirthday = (now.getMonth() > dob.getMonth()) || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate())
  if (!hasHadBirthday) age -= 1
  return age
}

function nextBirthdayInfo(dobIso: string) {
  const dob = new Date(dobIso)
  const now = new Date()
  const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
  if (next < now) next.setFullYear(now.getFullYear() + 1)
  const days = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return { date: next.toISOString().slice(0, 10), days }
}

export default function Kids() {
  const members = useStore(s => s.members)
  const addTask = useStore(s => s.addTask)
  const toggleTask = useStore(s => s.toggleTask)
  const tasks = useStore(s => s.tasks)
  const addMemory = useStore(s => s.addMemory)
  const memories = useStore(s => s.memories)
  const addEvent = useStore(s => s.addEvent)

  const parents = useMemo(() => members.filter(m => m.name === 'Mary (Mother)' || m.name === 'Samuel (Dad)'), [members])
  const childBirthdays = useMemo(() => ({
    Sidney: isoDate(1999, 6, 5),
    Sheldon: isoDate(2002, 11, 23),
    Smith: isoDate(2002, 11, 23),
  }), [])

  const kids = useMemo(() => {
    const wanted = ['Sidney', 'Sheldon', 'Smith']
    return wanted
      .map(name => ({ name, member: members.find(m => m.name === name) }))
      .filter(x => !!x.member)
      .map(x => ({
        id: x.member!.id,
        name: x.member!.name,
        role: 'teen' as const,
        dob: childBirthdays[x.member!.name as keyof typeof childBirthdays],
      }))
  }, [members, childBirthdays])

  const [selectedKidId, setSelectedKidId] = useState<string | undefined>(kids[0]?.id)
  const selectedKid = useMemo(() => kids.find(k => k.id === selectedKidId), [kids, selectedKidId])
  const [tab, setTab] = useState<'overview' | 'manage'>('overview')

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDate, setMilestoneDate] = useState('')
  const [limitMins, setLimitMins] = useState<number>(() => {
    const id = selectedKidId
    if (!id) return 60
    try { const v = localStorage.getItem(`ufp-screen-limit:${id}`); return v ? parseInt(v) : 60 } catch { return 60 }
  })
  const todayIso = new Date().toISOString().slice(0,10)
  const [usedMins, setUsedMins] = useState<number>(() => {
    const id = selectedKidId
    if (!id) return 0
    try { const v = localStorage.getItem(`ufp-screen-usage:${id}:${todayIso}`); return v ? parseInt(v) : 0 } catch { return 0 }
  })

  function updateKidSelection(id: string) {
    setSelectedKidId(id)
    try {
      const lim = localStorage.getItem(`ufp-screen-limit:${id}`)
      setLimitMins(lim ? parseInt(lim) : 60)
      const used = localStorage.getItem(`ufp-screen-usage:${id}:${todayIso}`)
      setUsedMins(used ? parseInt(used) : 0)
    } catch {}
  }

  function saveScreenSettings() {
    if (!selectedKidId) return
    try {
      localStorage.setItem(`ufp-screen-limit:${selectedKidId}`, String(limitMins))
      localStorage.setItem(`ufp-screen-usage:${selectedKidId}:${todayIso}`, String(usedMins))
    } catch {}
  }

  function addAssignment() {
    if (!selectedKidId || !title.trim()) return
    addTask({ title: title.trim(), assigneeId: selectedKidId, dueDate })
    setTitle('')
    setDueDate('')
  }

  function addKidMilestone() {
    if (!selectedKid) return
    const prefix = `${selectedKid.name}: `
    if (!milestoneTitle.trim()) return
    addMemory({ title: prefix + milestoneTitle.trim(), description: milestoneDate ? `Date: ${milestoneDate}` : undefined, date: milestoneDate || undefined, photoIds: [] })
    setMilestoneTitle('')
    setMilestoneDate('')
  }

  // Calendar: next birthday and study planner
  function addNextBirthdayToCalendar() {
    if (!selectedKid || !selectedKid.dob) return
    const nb = nextBirthdayInfo(selectedKid.dob)
    addEvent({ title: `Birthday: ${selectedKid.name}`, date: nb.date, memberId: selectedKid.id })
  }

  const [studySubject, setStudySubject] = useState('')
  const [studyDate, setStudyDate] = useState('')
  const [studyStart, setStudyStart] = useState('')
  const [studyEnd, setStudyEnd] = useState('')
  function addStudyToCalendar() {
    if (!selectedKid || !studySubject.trim() || !studyDate) return
    addEvent({ title: `Study: ${studySubject.trim()}`, date: studyDate, startTime: studyStart || undefined, endTime: studyEnd || undefined, memberId: selectedKid.id })
    setStudySubject(''); setStudyDate(''); setStudyStart(''); setStudyEnd('')
  }

  // Chore templates
  const choreTemplates = useMemo(() => ['Dishes', 'Clean room', 'Laundry', 'Take out trash', 'Walk the dog'], [])
  const [choreDue, setChoreDue] = useState('')
  function addChore(chore: string) {
    if (!selectedKid) return
    addTask({ title: `Chore: ${chore}`, assigneeId: selectedKid.id, dueDate: choreDue || undefined })
  }

  // Behavior points
  const [points, setPoints] = useState<number>(() => {
    if (!selectedKidId) return 0
    try { const v = localStorage.getItem(`ufp-behavior-points:${selectedKidId}`); return v ? parseInt(v) : 0 } catch { return 0 }
  })
  function updatePoints(delta: number) {
    if (!selectedKidId) return
    const next = Math.max(0, points + delta)
    setPoints(next)
    try { localStorage.setItem(`ufp-behavior-points:${selectedKidId}`, String(next)) } catch {}
  }

  // Pocket money
  type MoneyTxn = { id: string; amount: number; desc: string; date: string; method: 'mpesa' | 'card' | 'manual'; type: 'deposit' | 'withdraw'; status: 'pending' | 'succeeded' | 'failed'; reference?: string }
  const [moneyTxns, setMoneyTxns] = useState<MoneyTxn[]>(() => {
    if (!selectedKidId) return []
    try {
      const v = localStorage.getItem(`ufp-pocket-money:${selectedKidId}`)
      const parsed: any[] = v ? JSON.parse(v) : []
      return parsed.map(p => ({
        id: p.id,
        amount: p.amount,
        desc: p.desc,
        date: p.date,
        method: p.method ?? 'manual',
        type: p.type ?? (p.amount >= 0 ? 'deposit' : 'withdraw'),
        status: p.status ?? 'succeeded',
        reference: p.reference,
      }))
    } catch { return [] }
  })
  const balance = useMemo(() => moneyTxns.filter(t => t.status === 'succeeded').reduce((sum, t) => sum + t.amount, 0), [moneyTxns])
  const [moneyAmount, setMoneyAmount] = useState('')
  const [moneyDesc, setMoneyDesc] = useState('')
  function addMoneyTxn(sign: 1 | -1) {
    if (!selectedKidId) return
    const amt = parseFloat(moneyAmount || '0') * sign
    if (!amt || !moneyDesc.trim()) return
    const txn: MoneyTxn = { id: Math.random().toString(36).slice(2), amount: amt, desc: moneyDesc.trim(), date: new Date().toISOString().slice(0,10), method: 'manual', type: amt >= 0 ? 'deposit' : 'withdraw', status: 'succeeded' }
    const next = [txn, ...moneyTxns]
    setMoneyTxns(next)
    try { localStorage.setItem(`ufp-pocket-money:${selectedKidId}`, JSON.stringify(next)) } catch {}
    setMoneyAmount(''); setMoneyDesc('')
  }

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAction, setPayAction] = useState<'deposit'|'withdraw'>('deposit')
  const [payMethod, setPayMethod] = useState<'mpesa'|'card'>('mpesa')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState('')

  function openPayment(action: 'deposit'|'withdraw', method: 'mpesa'|'card') {
    setPayAction(action)
    setPayMethod(method)
    setShowPayModal(true)
    setPayError('')
  }

  async function processPayment() {
    if (!selectedKidId) return
    const amtNum = parseFloat(moneyAmount || '0')
    if (!amtNum || amtNum <= 0) { setPayError('Enter a valid amount'); return }
    if (!moneyDesc.trim()) { setPayError('Enter a description'); return }
    setPayLoading(true)
    setPayError('')
    const sign: 1 | -1 = payAction === 'deposit' ? +1 : -1
    const pending: MoneyTxn = {
      id: Math.random().toString(36).slice(2),
      amount: amtNum * sign,
      desc: moneyDesc.trim(),
      date: new Date().toISOString().slice(0,10),
      method: payMethod,
      type: payAction,
      status: 'pending'
    }
    const pendingList = [pending, ...moneyTxns]
    setMoneyTxns(pendingList)
    try { localStorage.setItem(`ufp-pocket-money:${selectedKidId}`, JSON.stringify(pendingList)) } catch {}

    let result: PaymentResult
    try {
      if (payMethod === 'mpesa') {
        if (!mpesaPhone.trim()) { throw new Error('Phone number required for MPesa') }
        result = payAction === 'deposit'
          ? await initiateMpesaDeposit({ amount: amtNum, phone: mpesaPhone.trim(), kidId: selectedKidId, description: moneyDesc.trim() })
          : await initiateMpesaWithdraw({ amount: amtNum, phone: mpesaPhone.trim(), kidId: selectedKidId, description: moneyDesc.trim() })
      } else {
        if (!paymentsDemo) {
          if (!cardName.trim()) throw new Error('Name on card required')
        }
        result = await initiateCardDeposit({ amount: amtNum, kidId: selectedKidId, name: cardName.trim(), cardNumber, expiry: cardExpiry, cvc: cardCvc, description: moneyDesc.trim() })
      }
    } catch (e) {
      result = { status: 'failed', message: (e as Error).message }
    }

    const next = moneyTxns.map(t => t.id === pending.id ? { ...t, status: result.status, reference: result.reference } : t)
    setMoneyTxns(next)
    try { localStorage.setItem(`ufp-pocket-money:${selectedKidId}`, JSON.stringify(next)) } catch {}
    setPayLoading(false)
    if (result.status === 'succeeded') {
      setShowPayModal(false)
      setMoneyAmount(''); setMoneyDesc('')
      setMpesaPhone(''); setCardName(''); setCardNumber(''); setCardExpiry(''); setCardCvc('')
    } else if (result.status === 'failed') {
      setPayError(result.message || 'Payment failed')
    }
  }

  // Emergency info
  type EmergencyInfo = { allergies?: string; doctor?: string; phone?: string }
  const [emg, setEmg] = useState<EmergencyInfo>(() => {
    if (!selectedKidId) return {}
    try { const v = localStorage.getItem(`ufp-emergency:${selectedKidId}`); return v ? JSON.parse(v) : {} } catch { return {} }
  })
  function saveEmergency() {
    if (!selectedKidId) return
    try { localStorage.setItem(`ufp-emergency:${selectedKidId}`, JSON.stringify(emg)) } catch {}
  }

  const kidTasks = useMemo(() => tasks.filter(t => t.assigneeId === selectedKidId), [tasks, selectedKidId])
  const kidMemories = useMemo(() => memories.filter(m => m.title.startsWith(selectedKid ? `${selectedKid.name}: ` : '')), [memories, selectedKid])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kids</h1>
        <div className="flex items-center gap-2">
        <button className={`px-3 py-1 rounded text-sm ${tab==='overview'?'btn-primary':'border'}`} onClick={()=>setTab('overview')}>Overview</button>
        <button className={`px-3 py-1 rounded text-sm ${tab==='manage'?'btn-primary':'border'}`} onClick={()=>setTab('manage')}>Manage</button>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid md:grid-cols-3 gap-4">
          {kids.map(k => {
            const age = k.dob ? ageFromDob(k.dob) : undefined
            const nb = k.dob ? nextBirthdayInfo(k.dob) : undefined
            return (
              <div key={k.id} className="p-4 border rounded bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center uppercase">{k.name[0]}</div>
                    <div>
                      <div className="font-medium">{k.name}</div>
                      <div className="text-xs text-gray-500">Teen</div>
                    </div>
                  </div>
          <button className={`px-2 py-1 rounded text-sm ${selectedKidId===k.id?'btn-primary':'border'}`} onClick={() => updateKidSelection(k.id)}>Manage</button>
                </div>
                {k.dob && (
                  <div className="mt-3 text-sm">
                    <div>Date of Birth: {k.dob}</div>
                    <div>Age: {age}</div>
                    {nb && <div>Next Birthday: {nb.date} • {nb.days} days</div>}
                  </div>
                )}
                <div className="mt-3 text-sm">
                  <div className="font-medium mb-1">Parents</div>
                  <ul className="list-disc ml-5">
                    {parents.map(p => (<li key={p.id}>{p.name}</li>))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'manage' && (
        <div className="grid gap-4">
          <div className="p-4 border rounded bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium">Milestones & Screen Time</h2>
              <select className="px-2 py-1 rounded border bg-white dark:bg-gray-900" value={selectedKidId} onChange={e => updateKidSelection(e.target.value)}>
                {kids.map(k => (<option key={k.id} value={k.id}>{k.name}</option>))}
              </select>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Milestone title" value={milestoneTitle} onChange={e=>setMilestoneTitle(e.target.value)} />
              <input type="date" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={milestoneDate} onChange={e=>setMilestoneDate(e.target.value)} />
            </div>
            <div className="mt-2 flex items-center gap-2">
        <button className="px-3 py-2 rounded btn-primary" onClick={addKidMilestone}>Add Milestone</button>
              <button className="px-3 py-2 rounded border" onClick={addNextBirthdayToCalendar}>Add Next Birthday to Calendar</button>
            </div>
            <ul className="mt-3 divide-y divide-gray-200 dark:divide-gray-700">
              {kidMemories.slice(0,6).map(m => (
                <li key={m.id} className="py-2">
                  <div className="font-medium">{m.title.replace(`${selectedKid?.name}: `, '')}</div>
                  {m.date && <div className="text-xs text-gray-500">On {m.date}</div>}
                </li>
              ))}
              {kidMemories.length === 0 && <li className="py-2 text-sm text-gray-500">No milestones yet</li>}
            </ul>
            <div className="mt-4 grid md:grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-sm mb-1">Daily limit (mins)</label>
                <input type="number" min={0} className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={limitMins} onChange={e=>setLimitMins(parseInt(e.target.value||'0'))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Today used (mins)</label>
                <input type="number" min={0} className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-900" value={usedMins} onChange={e=>setUsedMins(parseInt(e.target.value||'0'))} />
              </div>
              <div className="flex items-end">
                <button className="px-3 py-2 rounded border" onClick={saveScreenSettings}>Save</button>
              </div>
              <div className="md:col-span-3 text-sm text-gray-600 dark:text-gray-300">Remaining today: {Math.max(0, limitMins - usedMins)} mins</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'manage' && (
        <>
          <div className="grid gap-4">
            <div className="p-4 border rounded bg-white dark:bg-gray-800">
              <h2 className="text-lg font-medium mb-2">Study Planner</h2>
              <div className="grid md:grid-cols-2 gap-2">
                <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Subject" value={studySubject} onChange={e=>setStudySubject(e.target.value)} />
                <input type="date" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={studyDate} onChange={e=>setStudyDate(e.target.value)} />
                <input type="time" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={studyStart} onChange={e=>setStudyStart(e.target.value)} />
                <input type="time" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={studyEnd} onChange={e=>setStudyEnd(e.target.value)} />
              </div>
              <div className="mt-2">
        <button className="px-3 py-2 rounded btn-primary" onClick={addStudyToCalendar}>Add Study to Calendar</button>
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="p-4 border rounded bg-white dark:bg-gray-800">
              <h2 className="text-lg font-medium mb-2">Pocket Money</h2>
              <div className="grid md:grid-cols-2 gap-2">
                <input type="number" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Amount" value={moneyAmount} onChange={e=>setMoneyAmount(e.target.value)} />
                <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Description" value={moneyDesc} onChange={e=>setMoneyDesc(e.target.value)} />
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button className="px-3 py-2 rounded border" onClick={()=>addMoneyTxn(+1)}>Manual Deposit</button>
                <button className="px-3 py-2 rounded border" onClick={()=>addMoneyTxn(-1)}>Manual Withdraw</button>
                <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={()=>openPayment('deposit','mpesa')}>Deposit via MPesa</button>
        <button className="px-3 py-2 rounded btn-primary" onClick={()=>openPayment('deposit','card')}>Deposit via Card</button>
                <button className="px-3 py-2 rounded bg-yellow-600 text-white" onClick={()=>openPayment('withdraw','mpesa')}>Withdraw to MPesa</button>
                <div className="text-sm">Balance: {balance.toFixed(2)}</div>
              </div>
              <ul className="mt-3 divide-y divide-gray-200 dark:divide-gray-700">
                {moneyTxns.slice(0,6).map(tx => (
                  <li key={tx.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{tx.desc}</div>
                      <div className="text-xs text-gray-500">{tx.date} • {tx.method} • {tx.type} • {tx.status}{tx.reference?` • Ref ${tx.reference}`:''}</div>
                    </div>
                    <div className={`text-sm ${tx.amount>=0?'text-green-600':'text-red-600'}`}>{tx.amount>=0?'+':''}{tx.amount.toFixed(2)}</div>
                  </li>
                ))}
                {moneyTxns.length === 0 && <li className="py-2 text-sm text-gray-500">No transactions yet</li>}
              </ul>
          </div>
        </div>

        {showPayModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="w-full max-w-lg p-4 rounded bg-white dark:bg-gray-800 border">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-medium">{payAction==='deposit'?'Deposit':'Withdraw'} via {payMethod.toUpperCase()}</div>
                <button className="px-3 py-1 rounded border" onClick={()=>setShowPayModal(false)}>Close</button>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                <input type="number" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Amount" value={moneyAmount} onChange={e=>setMoneyAmount(e.target.value)} />
                <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Description" value={moneyDesc} onChange={e=>setMoneyDesc(e.target.value)} />
              </div>
              {payMethod==='mpesa' ? (
                <div className="mt-2 grid md:grid-cols-2 gap-2">
                  <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="MPesa phone (e.g. 2547...)" value={mpesaPhone} onChange={e=>setMpesaPhone(e.target.value)} />
                  <div className="text-xs text-gray-500 flex items-center">You will receive an STK Push prompt</div>
                </div>
              ) : (
                <div className="mt-2 grid md:grid-cols-2 gap-2">
                  <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Name on card" value={cardName} onChange={e=>setCardName(e.target.value)} />
                  <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Card number" value={cardNumber} onChange={e=>setCardNumber(e.target.value)} />
                  <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="MM/YY" value={cardExpiry} onChange={e=>setCardExpiry(e.target.value)} />
                  <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="CVC" value={cardCvc} onChange={e=>setCardCvc(e.target.value)} />
                  {!paymentsDemo && <div className="md:col-span-2 text-xs text-gray-500">Use a proper payment element (Stripe/Flutterwave) in production.</div>}
                </div>
              )}
              {payError && <div className="mt-2 text-sm text-red-600">{payError}</div>}
              <div className="mt-3 flex items-center gap-2">
        <button className={`px-3 py-2 rounded ${payLoading?'bg-gray-400 text-white':'btn-primary'}`} disabled={payLoading} onClick={processPayment}>{payLoading?'Processing...':'Confirm'}</button>
                <button className="px-3 py-2 rounded border" onClick={()=>setShowPayModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

          <div className="p-4 border rounded bg-white dark:bg-gray-800">
            <h2 className="text-lg font-medium mb-2">Emergency Info</h2>
            <div className="grid md:grid-cols-3 gap-2">
              <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Allergies" value={emg.allergies||''} onChange={e=>setEmg({...emg, allergies: e.target.value})} />
              <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Doctor" value={emg.doctor||''} onChange={e=>setEmg({...emg, doctor: e.target.value})} />
              <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Phone" value={emg.phone||''} onChange={e=>setEmg({...emg, phone: e.target.value})} />
            </div>
            <div className="mt-2">
              <button className="px-3 py-2 rounded border" onClick={saveEmergency}>Save Emergency Info</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}