import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'

type Profile = { allergies: string[]; conditions: string[]; medications: string[] }
type Appointment = { id: string; memberId: string; date: string; doctor: string; notes?: string }

export default function Health() {
  const { members } = useStore()
  const [appointments, setAppointments] = useState<Appointment[]>(() => load('ufp-health-appts', []))
  useEffect(() => { save('ufp-health-appts', appointments) }, [appointments])

  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(members[0]?.id)
  const [profiles, setProfiles] = useState<Record<string, Profile>>(() => {
    const obj: Record<string, Profile> = {}
    members.forEach(m => { obj[m.id] = load(`ufp-health:${m.id}`, { allergies: [], conditions: [], medications: [] }) })
    return obj
  })

  useEffect(() => {
    Object.entries(profiles).forEach(([mid, prof]) => save(`ufp-health:${mid}`, prof))
  }, [profiles])

  const selected = profiles[selectedMemberId || ''] || { allergies: [], conditions: [], medications: [] }

  // Adders
  const [allergy, setAllergy] = useState('')
  const [condition, setCondition] = useState('')
  const [medication, setMedication] = useState('')
  function addAllergy() { const t = allergy.trim(); if (!t || !selectedMemberId) return; setProfiles(p => ({ ...p, [selectedMemberId]: { ...selected, allergies: [...selected.allergies, t] } })); setAllergy('') }
  function addCondition() { const t = condition.trim(); if (!t || !selectedMemberId) return; setProfiles(p => ({ ...p, [selectedMemberId]: { ...selected, conditions: [...selected.conditions, t] } })); setCondition('') }
  function addMedication() { const t = medication.trim(); if (!t || !selectedMemberId) return; setProfiles(p => ({ ...p, [selectedMemberId]: { ...selected, medications: [...selected.medications, t] } })); setMedication('') }

  // Appointments
  const [apptDate, setApptDate] = useState('')
  const [apptDoctor, setApptDoctor] = useState('')
  const [apptNotes, setApptNotes] = useState('')
  function addAppointment() {
    if (!selectedMemberId || !apptDate.trim() || !apptDoctor.trim()) return
    setAppointments(a => [...a, { id: cryptoId(), memberId: selectedMemberId!, date: apptDate, doctor: apptDoctor, notes: apptNotes || undefined }])
    setApptDate(''); setApptDoctor(''); setApptNotes('')
  }

  const upcoming = useMemo(() => appointments.filter(a => new Date(a.date) >= new Date()), [appointments])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><IconHeart /> Health & Wellness</h1>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Profiles */}
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium flex items-center gap-2"><IconStethoscope /> Health Profiles</div>
            <select className="text-sm px-2 py-1 rounded border bg-white dark:bg-gray-900" value={selectedMemberId} onChange={e=>setSelectedMemberId(e.target.value)}>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {/* Allergies */}
          <div className="mb-3">
            <div className="text-sm font-medium flex items-center gap-2"><IconPill /> Allergies</div>
            <form className="flex gap-2 mt-1" onSubmit={(e)=>{e.preventDefault(); addAllergy()}}>
              <input className="flex-1 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Add allergy" value={allergy} onChange={e=>setAllergy(e.target.value)} />
        <button className="px-3 py-2 rounded btn-primary">Add</button>
            </form>
            <ul className="mt-2 flex flex-wrap gap-2">
              {selected.allergies.map((a, idx) => <span key={idx} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">{a}</span>)}
            </ul>
          </div>
          {/* Conditions */}
          <div className="mb-3">
            <div className="text-sm font-medium flex items-center gap-2"><IconStethoscope /> Conditions</div>
            <form className="flex gap-2 mt-1" onSubmit={(e)=>{e.preventDefault(); addCondition()}}>
              <input className="flex-1 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Add condition" value={condition} onChange={e=>setCondition(e.target.value)} />
        <button className="px-3 py-2 rounded btn-primary">Add</button>
            </form>
            <ul className="mt-2 flex flex-wrap gap-2">
              {selected.conditions.map((c, idx) => <span key={idx} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">{c}</span>)}
            </ul>
          </div>
          {/* Medications */}
          <div>
            <div className="text-sm font-medium flex items-center gap-2"><IconPill /> Medications</div>
            <form className="flex gap-2 mt-1" onSubmit={(e)=>{e.preventDefault(); addMedication()}}>
              <input className="flex-1 px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Add medication" value={medication} onChange={e=>setMedication(e.target.value)} />
        <button className="px-3 py-2 rounded btn-primary">Add</button>
            </form>
            <ul className="mt-2 flex flex-wrap gap-2">
              {selected.medications.map((m, idx) => <span key={idx} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">{m}</span>)}
            </ul>
          </div>
        </div>

        {/* Appointments */}
        <div className="p-4 border rounded bg-white dark:bg-gray-800">
          <div className="font-medium mb-2 flex items-center gap-2"><IconCalendar /> Appointments</div>
          <form className="grid md:grid-cols-4 gap-2 mb-3" onSubmit={(e)=>{e.preventDefault(); addAppointment()}}>
            <select className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={selectedMemberId} onChange={e=>setSelectedMemberId(e.target.value)}>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" className="px-3 py-2 rounded border bg-white dark:bg-gray-900" value={apptDate} onChange={e=>setApptDate(e.target.value)} />
            <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900" placeholder="Doctor or clinic" value={apptDoctor} onChange={e=>setApptDoctor(e.target.value)} />
            <input className="px-3 py-2 rounded border bg-white dark:bg-gray-900 md:col-span-4" placeholder="Notes (optional)" value={apptNotes} onChange={e=>setApptNotes(e.target.value)} />
            <button className="md:col-span-4 px-3 py-2 rounded bg-green-600 text-white">Add Appointment</button>
          </form>
          <ul className="space-y-2">
            {upcoming.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime()).map(a => (
              <li key={a.id} className="p-2 border rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{members.find(m=>m.id===a.memberId)?.name || 'Unknown'}</span>
                  <span className="text-xs text-gray-500">{new Date(a.date).toLocaleString()}</span>
                  <span className="ml-auto text-xs">{a.doctor}</span>
                </div>
                {a.notes && <div className="text-xs text-gray-600 mt-1">{a.notes}</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function load<T>(key: string, def: T): T { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def } catch { return def } }
function save(key: string, val: any) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }
function cryptoId() { return Math.random().toString(36).slice(2) }

function IconHeart() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-6.7-4.3-9.3-7A6.4 6.4 0 0112 4a6.4 6.4 0 019.3 10c-2.6 2.7-9.3 7-9.3 7z"/></svg>) }
function IconPill() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 3a5 5 0 017 7L10 15a5 5 0 11-7-7L8 3zm1.4 9.6l4.2-4.2"/></svg>) }
function IconStethoscope() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3v6a4 4 0 108 0V3h2v6a6 6 0 11-12 0V3h2zm10 9a3 3 0 103 3h-3v3h-2v-3a3 3 0 002-3z"/></svg>) }
function IconCalendar() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h2v2h6V2h2v2h3v16H4V4h3V2zm0 6h10v2H7V8z"/></svg>) }