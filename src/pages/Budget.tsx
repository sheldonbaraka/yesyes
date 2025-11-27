import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { format } from 'date-fns'

export default function Budget() {
  const { accounts, addAccount, transactions, addTransaction, removeTransaction, budgets, addBudgetEntry, recurringBills, addRecurringBill, toggleRecurringActive } = useStore()
  const [accName, setAccName] = useState('')
  const [accType, setAccType] = useState<'cash'|'bank'|'card'|'wallet'>('bank')
  const [txAccountId, setTxAccountId] = useState<string | undefined>(accounts[0]?.id)
  const [txType, setTxType] = useState<'income'|'expense'|'transfer'>('expense')
  const [txAmount, setTxAmount] = useState<number | ''>('')
  const [txCategory, setTxCategory] = useState('Groceries')
  const [txNote, setTxNote] = useState('')
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'))
  const monthTxns = useMemo(() => transactions.filter(t => (t.date || '').slice(0,7) === reportMonth), [transactions, reportMonth])
  const totals = useMemo(() => {
    const income = monthTxns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
    const expense = monthTxns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
    return { income, expense, net: income - expense }
  }, [monthTxns])
  const balances = useMemo(() => {
    const byAcc: Record<string, number> = {}
    transactions.forEach(t => {
      const sign = t.type==='income'?1: t.type==='expense'?-1:0
      byAcc[t.accountId] = (byAcc[t.accountId]||0) + sign * t.amount
    })
    return byAcc
  }, [transactions])

  const [budCategory, setBudCategory] = useState('Groceries')
  const [budAmount, setBudAmount] = useState<number | ''>('')
  const [budCurrency, setBudCurrency] = useState('USD')

  const [rbName, setRbName] = useState('Internet')
  const [rbAmount, setRbAmount] = useState<number | ''>('')
  const [rbDay, setRbDay] = useState<number | ''>('')
  // Visualization data
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {}
    monthTxns.forEach(t => {
      if (t.type !== 'expense') return
      const key = t.category || 'Uncategorized'
      map[key] = (map[key] || 0) + t.amount
    })
    const items = Object.entries(map).map(([category, amount]) => ({ category, amount }))
    items.sort((a,b)=> b.amount - a.amount)
    return items
  }, [monthTxns])

  // Monthly net trend for last 6 months
  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const points: { label: string; net: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const ym = format(d, 'yyyy-MM')
      const tx = transactions.filter(t => (t.date || '').slice(0,7) === ym)
      const income = tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
      const expense = tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
      points.push({ label: format(d, 'MMM'), net: income - expense })
    }
    return points
  }, [transactions])

  function LineGraph({ data }: { data: { label: string; net: number }[] }) {
    const width = 480
    const height = 160
    const padding = 24
    const xs = data.map((_, i) => padding + (i * (width - 2 * padding)) / Math.max(1, (data.length - 1)))
    const values = data.map(d => d.net)
    const max = Math.max(0, ...values)
    const min = Math.min(0, ...values)
    const scaleY = (v: number) => {
      if (max === min) return height / 2
      return padding + (height - 2 * padding) * (1 - (v - min) / (max - min))
    }
    const points = xs.map((x, i) => `${x},${scaleY(values[i])}`).join(' ')
    const zeroY = scaleY(0)
    return (
      <svg width={width} height={height} className="w-full">
        <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="currentColor" opacity={0.2} />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={scaleY(values[i])} r={3} fill="currentColor" />
        ))}
        {xs.map((x, i) => (
          <text key={`label-${i}`} x={x} y={height - 4} textAnchor="middle" className="text-[10px] fill-current opacity-70">{data[i].label}</text>
        ))}
      </svg>
    )
  }

  function PieChart({ income, expense }: { income: number; expense: number }) {
    const width = 220
    const height = 220
    const cx = width / 2
    const cy = height / 2
    const r = 90
    const total = Math.max(0, income) + Math.max(0, expense)
    if (total === 0) {
      return (
        <div className="h-40 flex items-center justify-center text-sm text-gray-500">No data for selected month</div>
      )
    }
    const fracIncome = Math.max(0, income) / total
    const fracExpense = Math.max(0, expense) / total
    const toXY = (angleDeg: number) => {
      const a = (angleDeg - 90) * Math.PI / 180
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
    }
    const arc = (start: number, end: number) => {
      const s = toXY(end)
      const e = toXY(start)
      const large = end - start > 180 ? 1 : 0
      return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`
    }
    const incEnd = fracIncome * 360
    const expStart = incEnd
    const expEnd = 360
    const incPct = Math.round(fracIncome * 100)
    const expPct = 100 - incPct
    return (
      <div className="flex flex-col items-center">
        <svg width={width} height={height}>
          <circle cx={cx} cy={cy} r={r} fill="#e5e7eb" />
          {/* Income slice (green) */}
          <path d={arc(0, incEnd)} fill="none" stroke="#16a34a" strokeWidth={r * 2} />
          {/* Expense slice (red) */}
          <path d={arc(expStart, expEnd)} fill="none" stroke="#dc2626" strokeWidth={r * 2} />
          {/* Donut hole */}
          <circle cx={cx} cy={cy} r={50} fill="white" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="text-sm fill-current">KES {(total).toFixed(2)}</text>
        </svg>
        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-green-600" /> Income: KES {income.toFixed(2)} ({incPct}%)</div>
          <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-red-600" /> Expense: KES {expense.toFixed(2)} ({expPct}%)</div>
        </div>
      </div>
    )
  }

  function addAcc(){ if(!accName.trim()) return; addAccount({ name: accName, type: accType }); setAccName('') }
  function addTx(){ if(!txAccountId || typeof txAmount!=='number') return; const date = format(new Date(), 'yyyy-MM-dd'); addTransaction({ accountId: txAccountId, type: txType, amount: txAmount, date, category: txCategory, note: txNote }); setTxAmount(''); setTxNote('') }
  function addBud(){ if(typeof budAmount!=='number') return; addBudgetEntry({ category: budCategory, amount: budAmount, currency: budCurrency, date: format(new Date(),'yyyy-MM-dd') }); setBudAmount('') }
  function addRb(){ if(typeof rbAmount!=='number' || typeof rbDay!=='number') return; addRecurringBill({ name: rbName, amount: rbAmount, dayOfMonth: rbDay, active: true }) ; setRbAmount(''); setRbDay('') }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><IconWallet /> Family Budget & Finance</h1>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconAccount /> Accounts</h2>
          <form className="grid grid-cols-[1fr_auto_auto] gap-2 mb-2" onSubmit={(e)=>{e.preventDefault(); addAcc()}}>
            <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Account name" value={accName} onChange={e=>setAccName(e.target.value)} />
            <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={accType} onChange={e=>setAccType(e.target.value as any)}>
              {(['bank','card','cash','wallet'] as const).map(t=> <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="px-3 py-2 rounded btn-primary">Add</button>
          </form>
          <ul className="space-y-2">
            {accounts.map(a => (
              <li key={a.id} className="p-2 border rounded flex items-center justify-between">
                <div>{a.name} <span className="text-xs text-gray-500">({a.type})</span></div>
                <div className="text-sm">{(balances[a.id]||0).toFixed(2)} USD</div>
              </li>
            ))}
            {accounts.length===0 && <li className="text-sm text-gray-500">No accounts yet</li>}
          </ul>
        </div>

        <div className="p-4 border rounded bg-white dark:bg-gray-800 lg:col-span-2">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconTransaction /> Transactions</h2>
          <form className="grid md:grid-cols-6 gap-2 mb-2" onSubmit={(e)=>{e.preventDefault(); addTx()}}>
            <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={txAccountId} onChange={e=>setTxAccountId(e.target.value)}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={txType} onChange={e=>setTxType(e.target.value as any)}>
              {(['income','expense','transfer'] as const).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" min={0} step="0.01" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Amount" value={txAmount} onChange={e=>setTxAmount(e.target.value?parseFloat(e.target.value):'')} />
            <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Category" value={txCategory} onChange={e=>setTxCategory(e.target.value)} />
            <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Note" value={txNote} onChange={e=>setTxNote(e.target.value)} />
            <button className="px-3 py-2 rounded btn-primary">Add</button>
          </form>

          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm">Month</label>
            <input type="month" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={reportMonth} onChange={e=>setReportMonth(e.target.value)} />
            <div className="ml-auto text-sm">Income: <span className="text-green-600">{totals.income.toFixed(2)}</span> • Expense: <span className="text-red-600">{totals.expense.toFixed(2)}</span> • Net: <span className={totals.net>=0?'text-green-600':'text-red-600'}>{totals.net.toFixed(2)}</span></div>
          </div>
          <ul className="space-y-2">
            {monthTxns.map(t => (
              <li key={t.id} className="p-2 border rounded flex items-center justify-between">
                <div>
                  <div className="text-sm">{format(new Date(t.date), 'dd MMM yyyy')} • {t.type} • {t.category || '—'}</div>
                  <div className="text-xs text-gray-500">{accounts.find(a=>a.id===t.accountId)?.name} • {t.note || ''}</div>
                </div>
                <div className={`text-sm ${t.type==='income'?'text-green-600': t.type==='expense'?'text-red-600':'text-gray-700'}`}>{t.type==='income'?'+':''}{t.amount.toFixed(2)}</div>
                <button className="text-xs text-red-600" onClick={()=>removeTransaction(t.id)}>Remove</button>
              </li>
            ))}
            {monthTxns.length===0 && <li className="text-sm text-gray-500">No transactions for selected month</li>}
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconBudget /> Category Budgets</h2>
          <form className="grid md:grid-cols-4 gap-2 mb-2" onSubmit={(e)=>{e.preventDefault(); addBud()}}>
            <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Category" value={budCategory} onChange={e=>setBudCategory(e.target.value)} />
            <input type="number" min={0} step="0.01" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Amount" value={budAmount} onChange={e=>setBudAmount(e.target.value?parseFloat(e.target.value):'')} />
            <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={budCurrency} onChange={e=>setBudCurrency(e.target.value)}>
              {['USD','EUR','GBP'].map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="px-3 py-2 rounded btn-primary">Add</button>
          </form>
          <ul className="space-y-2">
            {budgets.map(b => (
              <li key={b.id} className="p-2 border rounded flex items-center justify-between">
                <div className="text-sm">{b.category} • {b.amount.toFixed(2)} {b.currency}</div>
                <div className="text-xs text-gray-500">{b.date}</div>
              </li>
            ))}
            {budgets.length===0 && <li className="text-sm text-gray-500">No budgets yet</li>}
          </ul>
        </div>
        <div className="p-4 border rounded bg-white dark:bg-gray-800 lg:col-span-2">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconCalendar /> Recurring Bills</h2>
          <form className="grid md:grid-cols-5 gap-2 mb-2" onSubmit={(e)=>{e.preventDefault(); addRb()}}>
            <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Bill name" value={rbName} onChange={e=>setRbName(e.target.value)} />
            <input type="number" min={0} step="0.01" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Amount" value={rbAmount} onChange={e=>setRbAmount(e.target.value?parseFloat(e.target.value):'')} />
            <input type="number" min={1} max={28} className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Due day" value={rbDay} onChange={e=>setRbDay(e.target.value?parseInt(e.target.value):'')} />
            <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={txAccountId} onChange={e=>setTxAccountId(e.target.value)}>
              <option value="">Unassigned</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button className="px-3 py-2 rounded btn-primary">Add</button>
          </form>
          <ul className="space-y-2">
            {recurringBills.map(rb => (
              <li key={rb.id} className="p-2 border rounded flex items-center justify-between">
                <div>
                  <div className="text-sm">{rb.name} • {rb.amount.toFixed(2)} USD • Due {rb.dayOfMonth}</div>
                  <div className="text-xs text-gray-500">{rb.active? 'Active' : 'Paused'}</div>
                </div>
                <button className="text-xs" onClick={()=>toggleRecurringActive(rb.id)}>{rb.active? 'Pause' : 'Resume'}</button>
              </li>
            ))}
            {recurringBills.length===0 && <li className="text-sm text-gray-500">No recurring bills</li>}
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconCalendar /> Monthly Net Trend (KES)</h2>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Net over the last 6 months</div>
          <LineGraph data={monthlyTrend} />
          <div className="mt-2 text-sm">Latest net: <span className={monthlyTrend[monthlyTrend.length-1]?.net>=0?'text-green-600':'text-red-600'}>KES {(monthlyTrend[monthlyTrend.length-1]?.net || 0).toFixed(2)}</span></div>
        </div>
        <div className="p-4 border rounded bg-white dark:bg-gray-800 lg:col-span-2">
          <h2 className="font-medium mb-2 flex items-center gap-2"><IconTransaction /> Category Spending (month)</h2>
          <div className="space-y-2">
            {categoryTotals.length === 0 && <div className="text-sm text-gray-500">No expenses this month</div>}
            {categoryTotals.map(ct => {
              const max = categoryTotals[0]?.amount || 1
              const pct = Math.round((ct.amount / max) * 100)
              return (
                <div key={ct.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs"><span>{ct.category}</span><span>KES {ct.amount.toFixed(2)}</span></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded">
                    <div className="h-2 bg-blue-600 rounded" style={{ width: pct + '%' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}

function IconWallet(){return(<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7h18a2 2 0 012 2v8a2 2 0 01-2 2H2V7zm2 2v8h16V9H4zm10 3h4v2h-4v-2z"/></svg>)}
function IconAccount(){return(<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-9 9a9 9 0 0118 0H3z"/></svg>)}
function IconTransaction(){return(<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v2H4V5zm0 6h10v2H4v-2zm0 6h16v2H4v-2z"/></svg>)}
function IconBudget(){return(<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>)}
function IconCalendar(){return(<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h2v2h6V2h2v2h3v16H4V4h3V2zm0 6h10v2H7V8z"/></svg>)}