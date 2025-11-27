import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type {
  AppState,
  CalendarEvent,
  Task,
  ShoppingList,
  ShoppingItem,
  Trip,
  ItineraryItem,
  PackingItem,
  BudgetEntry,
  Member,
  EventCategory,
  DocumentItem,
  PhotoItem,
  Album,
  MemoryItem,
  ChatMessage,
  Poll,
  MealPlan,
  PantryItem,
  Recipe,
  FinanceAccount,
  FinanceTransaction,
  RecurringBill,
} from './types'
import { realtime } from './realtime'

type Store = AppState & {
  addMember: (name: string, role: Member['role']) => void
  addCategory: (name: string, color: string) => void
  addEvent: (e: Omit<CalendarEvent, 'id'>) => void
  toggleTask: (id: string) => void
  addTask: (t: Omit<Task, 'id' | 'completed'>) => void
  addList: (name: string, store?: string) => void
  addItemToList: (listId: string, item: Omit<ShoppingItem, 'id' | 'checked'>) => void
  toggleItem: (listId: string, itemId: string) => void
  addTrip: (t: Omit<Trip, 'id'>) => void
  addItineraryItem: (i: Omit<ItineraryItem, 'id'>) => void
  addPackingItem: (p: Omit<PackingItem, 'id' | 'packed'>) => void
  togglePacked: (packingId: string) => void
  addBudgetEntry: (b: Omit<BudgetEntry, 'id'>) => void
  // Meals
  addMealPlan: (m: Omit<MealPlan, 'id'>) => void
  updateMealPlan: (id: string, patch: Partial<MealPlan>) => void
  removeMealPlan: (id: string) => void
  addPantryItem: (p: Omit<PantryItem, 'id'>) => void
  updatePantryItem: (id: string, patch: Partial<PantryItem>) => void
  addRecipe: (r: Omit<Recipe, 'id'>) => void
  updateRecipe: (id: string, patch: Partial<Recipe>) => void
  removeRecipe: (id: string) => void
  // Finance
  addAccount: (a: Omit<FinanceAccount, 'id'>) => void
  addTransaction: (t: Omit<FinanceTransaction, 'id'>) => void
  removeTransaction: (id: string) => void
  addRecurringBill: (b: Omit<RecurringBill, 'id'>) => void
  toggleRecurringActive: (id: string) => void
  addAnnouncement: (text: string, urgent?: boolean) => void
  addDocument: (d: Omit<DocumentItem, 'id' | 'createdAt'>) => DocumentItem
  addPhoto: (p: Omit<PhotoItem, 'id' | 'createdAt'>) => PhotoItem
  updatePhoto: (id: string, patch: Partial<PhotoItem>) => void
  addAlbum: (a: Omit<Album, 'id' | 'createdAt'>) => Album
  updateAlbum: (id: string, patch: Partial<Album>) => void
  addMemory: (m: Omit<MemoryItem, 'id' | 'createdAt'>) => MemoryItem
  updateMemory: (id: string, patch: Partial<MemoryItem>) => void
  sendChatMessage: (text: string) => void
  setTyping: (isTyping: boolean) => void
  addPoll: (question: string, options: string[]) => void
  votePoll: (pollId: string, optionId: string) => void
  chatTyping: Record<string, number>
  presence: Record<string, number>
  pingPresence: () => void
  setPresenceOffline: () => void
  markDelivered: (messageId: string) => void
  markRead: (messageId: string) => void
  signUp: (name: string, email: string, password: string) => Promise<string>
  signInWithCredentials: (email: string, password: string) => Promise<void>
  signIn: (memberId: string) => void
  signOut: () => void
}

function desiredMembers(): Member[] {
  return [
    { id: uuid(), name: 'Sheldon', role: 'teen' },
    { id: uuid(), name: 'Smith', role: 'adult' },
    { id: uuid(), name: 'Mary (Mother)', role: 'adult' },
    { id: uuid(), name: 'Samuel (Dad)', role: 'adult' },
    { id: uuid(), name: 'Sidney', role: 'child' },
  ]
}

const ALLOWED_MEMBER_NAMES = new Set<string>([
  'Sheldon', 'Smith', 'Mary (Mother)', 'Samuel (Dad)', 'Sidney'
])

function roleForName(name: string): Member['role'] {
  if (name === 'Sheldon') return 'teen'
  if (name === 'Sidney') return 'child'
  return 'adult'
}

function simpleHash(password: string): string {
  let h = 0 >>> 0
  for (let i = 0; i < password.length; i++) {
    h = (h * 31 + password.charCodeAt(i)) >>> 0
  }
  return h.toString(16)
}

async function hashPassword(password: string): Promise<string> {
  const pwd = password.trim()
  try {
    const enc = new TextEncoder()
    const data = enc.encode(pwd)
    const digest = await crypto.subtle.digest('SHA-256', data)
    const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
    return `sha256:${hex}`
  } catch {
    // Fallback to a simple deterministic hash (not cryptographically secure)
    return `simple:${simpleHash(pwd)}`
  }
}

const initial: AppState = {
  members: desiredMembers(),
  categories: [
    { id: uuid(), name: 'School', color: '#06b6d4' },
    { id: uuid(), name: 'Work', color: '#f59e0b' },
    { id: uuid(), name: 'Family', color: '#10b981' },
  ],
  events: [],
  tasks: [],
  lists: [
    { id: uuid(), name: 'Groceries', items: [] },
  ],
  mealPlans: [],
  pantry: [],
  recipes: [],
  accounts: [],
  transactions: [],
  recurringBills: [],
  trips: [],
  itinerary: [],
  packing: [],
  budgets: [],
  documents: [],
  photos: [],
  albums: [],
  memories: [],
  announcements: [],
  activity: [],
  chatMessages: [],
  polls: [],
  currentMemberId: undefined,
}

const STORAGE_KEY = 'ufp-store'

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw) as AppState
    // Migration: replace sample members with requested family members once
    const sampleNames = new Set(['Alex', 'Sam', 'Taylor'])
    const hasOnlySample = parsed.members.length > 0 && parsed.members.every(m => sampleNames.has(m.name))
    if (hasOnlySample || parsed.members.length === 0) {
      parsed.members = desiredMembers()
    }
    if (!Array.isArray((parsed as any).documents)) {
      (parsed as any).documents = []
    }
    if (!Array.isArray((parsed as any).photos)) {
      (parsed as any).photos = []
    }
    if (!Array.isArray((parsed as any).albums)) {
      (parsed as any).albums = []
    }
    if (!Array.isArray((parsed as any).memories)) {
      (parsed as any).memories = []
    }
    if (!Array.isArray((parsed as any).chatMessages)) {
      (parsed as any).chatMessages = []
    }
    if (!Array.isArray((parsed as any).polls)) {
      (parsed as any).polls = []
    }
    if (!Array.isArray((parsed as any).mealPlans)) {
      (parsed as any).mealPlans = []
    }
    if (!Array.isArray((parsed as any).pantry)) {
      (parsed as any).pantry = []
    }
    if (!Array.isArray((parsed as any).recipes)) {
      (parsed as any).recipes = []
    }
    if (!Array.isArray((parsed as any).accounts)) {
      (parsed as any).accounts = []
    }
    if (!Array.isArray((parsed as any).transactions)) {
      (parsed as any).transactions = []
    }
    if (!Array.isArray((parsed as any).recurringBills)) {
      (parsed as any).recurringBills = []
    }
    // Normalize member emails and migrate password hash prefixes for consistency
    parsed.members = (parsed.members || []).map(m => {
      const email = m.email?.trim().toLowerCase()
      let passwordHash = m.passwordHash
      if (passwordHash && !passwordHash.includes(':')) {
        // Previously stored raw sha256 hex; prefix for algorithm clarity
        passwordHash = `sha256:${passwordHash}`
      }
      return { ...m, email, passwordHash }
    })
    // ensure currentMemberId exists but respects restriction implicitly
    return parsed
  } catch {
    return initial
  }
}

export const useStore = create<Store>((set, get) => ({
  ...load(),
  chatTyping: {},
  presence: {},
  addMember: (name, role) => set((s) => ({ members: [...s.members, { id: uuid(), name, role }] })),
  addCategory: (name, color) => set((s) => ({ categories: [...s.categories, { id: uuid(), name, color }] })),
  // publish realtime
  addEvent: (e) => set((s) => {
    const item = { ...e, id: uuid() }
    try { realtime.publish({ type: 'event.add', payload: item }) } catch {}
    return {
      events: [...s.events, item],
      activity: [...s.activity, { id: uuid(), type: 'event', message: `Event added: ${e.title}`, createdAt: new Date().toISOString() }],
    }
  }),
  addTask: (t) => set((s) => {
    const item = { ...t, id: uuid(), completed: false }
    try { realtime.publish({ type: 'task.add', payload: item }) } catch {}
    return {
      tasks: [...s.tasks, item],
      activity: [...s.activity, { id: uuid(), type: 'task', message: `Task created: ${t.title}`, createdAt: new Date().toISOString() }],
    }
  }),
  toggleTask: (id) => set((s) => {
    const current = s.tasks.find(x => x.id === id)
    const nextCompleted = current ? !current.completed : true
    try { realtime.publish({ type: 'task.toggle', payload: { id, completed: nextCompleted } }) } catch {}
    return {
      tasks: s.tasks.map((x) => x.id === id ? { ...x, completed: nextCompleted } : x),
      activity: [...s.activity, { id: uuid(), type: 'task', message: `Task toggled: ${id}`, createdAt: new Date().toISOString() }],
    }
  }),
  addList: (name, store) => set((s) => {
    const list = { id: uuid(), name, store, items: [] as ShoppingItem[] }
    try { realtime.publish({ type: 'list.add', payload: list }) } catch {}
    return {
      lists: [...s.lists, list],
      activity: [...s.activity, { id: uuid(), type: 'list', message: `List created: ${name}`, createdAt: new Date().toISOString() }],
    }
  }),
  addItemToList: (listId, item) => set((s) => {
    const newItem = { ...item, id: uuid(), checked: false }
    try { realtime.publish({ type: 'list.item.add', payload: { listId, item: newItem } }) } catch {}
    return {
      lists: s.lists.map((l) => l.id === listId ? { ...l, items: [...l.items, newItem] } : l),
      activity: [...s.activity, { id: uuid(), type: 'list', message: `Item added: ${item.name}`, createdAt: new Date().toISOString() }],
    }
  }),
  toggleItem: (listId, itemId) => set((s) => {
    const l = s.lists.find(x => x.id === listId)
    const it = l?.items.find(x => x.id === itemId)
    const nextChecked = it ? !it.checked : true
    try { realtime.publish({ type: 'list.item.toggle', payload: { listId, itemId, checked: nextChecked } }) } catch {}
    return {
      lists: s.lists.map((l) => l.id === listId ? {
        ...l,
        items: l.items.map((it) => it.id === itemId ? { ...it, checked: nextChecked } : it)
      } : l),
      activity: [...s.activity, { id: uuid(), type: 'list', message: `Item toggled`, createdAt: new Date().toISOString() }],
    }
  }),
  addTrip: (t) => set((s) => {
    const item = { ...t, id: uuid() }
    try { realtime.publish({ type: 'trip.add', payload: item }) } catch {}
    return {
      trips: [...s.trips, item],
      activity: [...s.activity, { id: uuid(), type: 'trip', message: `Trip created: ${t.title}`, createdAt: new Date().toISOString() }],
    }
  }),
  addItineraryItem: (i) => set((s) => {
    const item = { ...i, id: uuid() }
    try { realtime.publish({ type: 'itinerary.add', payload: item }) } catch {}
    return {
      itinerary: [...s.itinerary, item],
      activity: [...s.activity, { id: uuid(), type: 'itinerary', message: `Itinerary added: ${i.title}`, createdAt: new Date().toISOString() }],
    }
  }),
  addPackingItem: (p) => set((s) => {
    const item = { ...p, id: uuid(), packed: false }
    try { realtime.publish({ type: 'packing.add', payload: item }) } catch {}
    return {
      packing: [...s.packing, item],
      activity: [...s.activity, { id: uuid(), type: 'packing', message: `Packing item: ${p.name}`, createdAt: new Date().toISOString() }],
    }
  }),
  togglePacked: (packingId) => set((s) => {
    const current = s.packing.find(x => x.id === packingId)
    const nextPacked = current ? !current.packed : true
    try { realtime.publish({ type: 'packing.toggle', payload: { id: packingId, packed: nextPacked } }) } catch {}
    return {
      packing: s.packing.map((x) => x.id === packingId ? { ...x, packed: nextPacked } : x),
      activity: [...s.activity, { id: uuid(), type: 'packing', message: `Packing toggled`, createdAt: new Date().toISOString() }],
    }
  }),
  addBudgetEntry: (b) => set((s) => {
    const item = { ...b, id: uuid() }
    try { realtime.publish({ type: 'budget.add', payload: item }) } catch {}
    return {
      budgets: [...s.budgets, item],
      activity: [...s.activity, { id: uuid(), type: 'budget', message: `Budget entry: ${b.category} ${b.amount}${b.currency}`, createdAt: new Date().toISOString() }],
    }
  }),
  // Meals
  addMealPlan: (m) => set((s) => ({
    mealPlans: [...s.mealPlans, { ...m, id: uuid() }],
    activity: [...s.activity, { id: uuid(), type: 'task', message: `Meal planned: ${m.title} (${m.mealType})`, createdAt: new Date().toISOString() }],
  })),
  updateMealPlan: (id, patch) => set((s) => ({
    mealPlans: s.mealPlans.map(mp => mp.id === id ? { ...mp, ...patch } : mp)
  })),
  removeMealPlan: (id) => set((s) => ({
    mealPlans: s.mealPlans.filter(mp => mp.id !== id)
  })),
  addPantryItem: (p) => set((s) => ({
    pantry: [...s.pantry, { ...p, id: uuid() }],
    activity: [...s.activity, { id: uuid(), type: 'list', message: `Pantry item: ${p.name}`, createdAt: new Date().toISOString() }],
  })),
  updatePantryItem: (id, patch) => set((s) => ({
    pantry: s.pantry.map(pi => pi.id === id ? { ...pi, ...patch } : pi)
  })),
  addRecipe: (r) => set((s) => ({
    recipes: [...s.recipes, { ...r, id: uuid() }]
  })),
  updateRecipe: (id, patch) => set((s) => ({
    recipes: s.recipes.map(rc => rc.id === id ? { ...rc, ...patch } : rc)
  })),
  removeRecipe: (id) => set((s) => ({
    recipes: s.recipes.filter(rc => rc.id !== id)
  })),
  // Finance
  addAccount: (a) => set((s) => ({
    accounts: [...s.accounts, { ...a, id: uuid() }],
    activity: [...s.activity, { id: uuid(), type: 'budget', message: `Account added: ${a.name}`, createdAt: new Date().toISOString() }],
  })),
  addTransaction: (t) => set((s) => ({
    transactions: [{ ...t, id: uuid() }, ...s.transactions],
    activity: [...s.activity, { id: uuid(), type: 'budget', message: `Transaction: ${t.type} ${t.amount}`, createdAt: new Date().toISOString() }],
  })),
  removeTransaction: (id) => set((s) => ({
    transactions: s.transactions.filter(tx => tx.id !== id)
  })),
  addRecurringBill: (b) => set((s) => ({
    recurringBills: [...s.recurringBills, { ...b, id: uuid() }]
  })),
  toggleRecurringActive: (id) => set((s) => ({
    recurringBills: s.recurringBills.map(rb => rb.id === id ? { ...rb, active: !rb.active } : rb)
  })),
  addAnnouncement: (text, urgent) => {
    const ann = { id: uuid(), text, urgent, createdAt: new Date().toISOString() }
    set((s) => ({ announcements: [...s.announcements, ann] }))
    // Broadcast to other tabs/devices
    try { realtime.publish({ type: 'announcement.add', payload: ann }) } catch {}
  },
  addDocument: (d) => {
    const item: DocumentItem = { id: uuid(), createdAt: new Date().toISOString(), ...d }
    set((s) => ({
      documents: [item, ...s.documents],
      activity: [...s.activity, { id: uuid(), type: 'list', message: `Document uploaded: ${item.name}`, createdAt: new Date().toISOString() }],
    }))
    try { realtime.publish({ type: 'document.add', payload: item }) } catch {}
    return item
  },
  addPhoto: (p) => {
    const item: PhotoItem = { id: uuid(), createdAt: new Date().toISOString(), ...p }
    set((s) => ({
      photos: [item, ...s.photos],
      activity: [...s.activity, { id: uuid(), type: 'list', message: `Photo uploaded: ${item.name}`, createdAt: new Date().toISOString() }],
    }))
    try { realtime.publish({ type: 'photo.add', payload: item }) } catch {}
    return item
  },
  updatePhoto: (id, patch) => set((s) => ({
    photos: s.photos.map(p => p.id === id ? { ...p, ...patch } : p)
  })),
  addAlbum: (a) => {
    const item: Album = { id: uuid(), createdAt: new Date().toISOString(), ...a }
    set((s) => ({
      albums: [item, ...s.albums],
      activity: [...s.activity, { id: uuid(), type: 'list', message: `Album created: ${item.name}`, createdAt: new Date().toISOString() }],
    }))
    try { realtime.publish({ type: 'album.add', payload: item }) } catch {}
    return item
  },
  updateAlbum: (id, patch) => {
    set((s) => ({ albums: s.albums.map(a => a.id === id ? { ...a, ...patch } : a) }))
    try { realtime.publish({ type: 'album.update', payload: { id, patch } }) } catch {}
  },
  addMemory: (m) => {
    const item: MemoryItem = { id: uuid(), createdAt: new Date().toISOString(), ...m }
    set((s) => ({
      memories: [item, ...s.memories],
      activity: [...s.activity, { id: uuid(), type: 'list', message: `Memory created: ${item.title}`, createdAt: new Date().toISOString() }],
    }))
    try { realtime.publish({ type: 'memory.add', payload: item }) } catch {}
    return item
  },
  updateMemory: (id, patch) => {
    set((s) => ({ memories: s.memories.map(m => m.id === id ? { ...m, ...patch } : m) }))
    try { realtime.publish({ type: 'memory.update', payload: { id, patch } }) } catch {}
  },
  sendChatMessage: (text) => {
    const s = get()
    const senderId = s.currentMemberId || s.members[0]?.id
    if (!senderId) return
    const msg: ChatMessage = { id: uuid(), senderId, text: text.trim(), createdAt: new Date().toISOString(), deliveredBy: [senderId], readBy: [] }
    if (!msg.text) return
    set({ chatMessages: [...s.chatMessages, msg] })
    try { realtime.publish({ type: 'chat.message', payload: msg }) } catch {}
  },
  setTyping: (isTyping) => {
    const s = get()
    const memberId = s.currentMemberId || s.members[0]?.id
    if (!memberId) return
    const ts = isTyping ? Date.now() : 0
    set({ chatTyping: { ...s.chatTyping, [memberId]: ts } })
    try { realtime.publish({ type: 'chat.typing', payload: { memberId, ts } }) } catch {}
  },
  addPoll: (question, options) => {
    const cleanQ = question.trim()
    const opts = options.map(o => o.trim()).filter(Boolean)
    if (!cleanQ || opts.length < 2) return
    const poll: Poll = {
      id: uuid(),
      question: cleanQ,
      options: opts.map(o => ({ id: uuid(), text: o, votes: [] })),
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ polls: [poll, ...s.polls] }))
    try { realtime.publish({ type: 'poll.add', payload: poll }) } catch {}
  },
  votePoll: (pollId, optionId) => {
    const s = get()
    const memberId = s.currentMemberId || s.members[0]?.id
    if (!memberId) return
    set({
      polls: s.polls.map(p => p.id === pollId ? {
        ...p,
        options: p.options.map(opt => opt.id === optionId ? {
          ...opt,
          votes: Array.from(new Set([...(opt.votes || []), memberId]))
        } : opt)
      } : p)
    })
    try { realtime.publish({ type: 'poll.vote', payload: { pollId, optionId, memberId } }) } catch {}
  },
  pingPresence: () => {
    const s = get()
    const memberId = s.currentMemberId || s.members[0]?.id
    if (!memberId) return
    const ts = Date.now()
    set({ presence: { ...s.presence, [memberId]: ts } })
    try { realtime.publish({ type: 'presence.ping', payload: { memberId, ts } }) } catch {}
  },
  setPresenceOffline: () => {
    const s = get()
    const memberId = s.currentMemberId || s.members[0]?.id
    if (!memberId) return
    const next = { ...s.presence }
    delete next[memberId]
    set({ presence: next })
    try { realtime.publish({ type: 'presence.offline', payload: { memberId } }) } catch {}
  },
  markDelivered: (messageId) => {
    const s = get()
    const memberId = s.currentMemberId || s.members[0]?.id
    if (!memberId) return
    set({
      chatMessages: s.chatMessages.map(m => m.id === messageId ? {
        ...m,
        deliveredBy: Array.from(new Set([...(m.deliveredBy || []), memberId]))
      } : m)
    })
    try { realtime.publish({ type: 'chat.delivered', payload: { messageId, memberId } }) } catch {}
  },
  markRead: (messageId) => {
    const s = get()
    const memberId = s.currentMemberId || s.members[0]?.id
    if (!memberId) return
    set({
      chatMessages: s.chatMessages.map(m => m.id === messageId ? {
        ...m,
        readBy: Array.from(new Set([...(m.readBy || []), memberId]))
      } : m)
    })
    try { realtime.publish({ type: 'chat.read', payload: { messageId, memberId } }) } catch {}
  },
  signUp: async (name: string, email: string, password: string) => {
    if (!ALLOWED_MEMBER_NAMES.has(name)) throw new Error('Sign up restricted to family members')
    const s = get()
    const normalizedEmail = email.trim().toLowerCase()
    const emailExists = s.members.some(m => (m.email?.trim().toLowerCase()) === normalizedEmail)
    if (emailExists) throw new Error('Email already registered')
    const existingByName = s.members.find(m => m.name === name)
    if (existingByName && existingByName.email) throw new Error('Account already exists; please login')
    const passwordHash = await hashPassword(password)
    const member = { id: uuid(), name, role: roleForName(name), email: normalizedEmail, passwordHash }
    set({ members: [...s.members, member] })
    try { realtime.publish({ type: 'member.add', payload: member }) } catch {}
    return member.id
  },
  signInWithCredentials: async (email: string, password: string) => {
    const s = get()
    const normalizedEmail = email.trim().toLowerCase()
    const m = s.members.find(x => (x.email?.trim().toLowerCase()) === normalizedEmail)
    if (!m) throw new Error('Account not found')
    if (!ALLOWED_MEMBER_NAMES.has(m.name)) throw new Error('Sign in restricted to family members')
    const computed = await hashPassword(password)
    const stored = m.passwordHash || ''
    if (stored) {
      if (stored.includes(':')) {
        if (stored !== computed) throw new Error('Invalid password')
      } else {
        // Backward compatibility: compare against raw sha256 hex if present
        if (!computed.startsWith('sha256:') || stored !== computed.slice('sha256:'.length)) throw new Error('Invalid password')
      }
    } else {
      throw new Error('Invalid password')
    }
    set({ currentMemberId: m.id })
  },
  signIn: (memberId: string) => {
    const s = get()
    const m = s.members.find(x => x.id === memberId)
    if (!m) throw new Error('Member not found')
    if (!ALLOWED_MEMBER_NAMES.has(m.name)) throw new Error('Sign in restricted to family members')
    set({ currentMemberId: m.id })
  },
  signOut: () => {
    try { localStorage.removeItem('ufp-remembered-member') } catch {}
    set({ currentMemberId: undefined })
  },
}))

// Persist on changes
useStore.subscribe((state) => {
  const { members, categories, events, tasks, lists, mealPlans, pantry, recipes, accounts, transactions, recurringBills, trips, itinerary, packing, budgets, announcements, activity, documents, photos, albums, memories, chatMessages, polls, currentMemberId } = state
  const snapshot: AppState = { members, categories, events, tasks, lists, mealPlans, pantry, recipes, accounts, transactions, recurringBills, trips, itinerary, packing, budgets, announcements, activity, documents, photos, albums, memories, chatMessages, polls, currentMemberId }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {}
})

// Receive realtime announcements
realtime.subscribe((msg) => {
  if (msg?.type === 'presence.ping' && msg.payload) {
    const { memberId, ts } = msg.payload as { memberId: string; ts: number }
    const s = useStore.getState()
    useStore.setState({ presence: { ...s.presence, [memberId]: ts } })
  }
  if (msg?.type === 'presence.offline' && msg.payload) {
    const { memberId } = msg.payload as { memberId: string }
    const s = useStore.getState()
    const next = { ...s.presence }
    delete next[memberId]
    useStore.setState({ presence: next })
  }
  if (msg?.type === 'chat.message' && msg.payload) {
    const incoming = msg.payload as ChatMessage
    const s = useStore.getState()
    const exists = s.chatMessages.some(m => m.id === incoming.id)
    if (exists) return
    useStore.setState({ chatMessages: [...s.chatMessages, incoming] })
    // Auto-mark delivered for this client
    const selfId = s.currentMemberId || s.members[0]?.id
    if (selfId && incoming.senderId !== selfId) {
      const already = incoming.deliveredBy?.includes(selfId)
      if (!already) {
        try { realtime.publish({ type: 'chat.delivered', payload: { messageId: incoming.id, memberId: selfId } }) } catch {}
        useStore.setState({
          chatMessages: useStore.getState().chatMessages.map(m => m.id === incoming.id ? { ...m, deliveredBy: Array.from(new Set([...(m.deliveredBy || []), selfId])) } : m)
        })
      }
    }
  }
  if (msg?.type === 'chat.delivered' && msg.payload) {
    const { messageId, memberId } = msg.payload as { messageId: string; memberId: string }
    const s = useStore.getState()
    useStore.setState({
      chatMessages: s.chatMessages.map(m => m.id === messageId ? { ...m, deliveredBy: Array.from(new Set([...(m.deliveredBy || []), memberId])) } : m)
    })
  }
  if (msg?.type === 'chat.read' && msg.payload) {
    const { messageId, memberId } = msg.payload as { messageId: string; memberId: string }
    const s = useStore.getState()
    useStore.setState({
      chatMessages: s.chatMessages.map(m => m.id === messageId ? { ...m, readBy: Array.from(new Set([...(m.readBy || []), memberId])) } : m)
    })
  }
  if (msg?.type === 'chat.typing' && msg.payload) {
    const { memberId, ts } = msg.payload as { memberId: string; ts: number }
    const s = useStore.getState()
    useStore.setState({ chatTyping: { ...s.chatTyping, [memberId]: ts } })
  }
  if (msg?.type === 'announcement.add' && msg.payload) {
    const incoming = msg.payload as { id: string; text: string; urgent?: boolean; createdAt: string }
    const s = useStore.getState()
    const exists = s.announcements.some(a => a.id === incoming.id)
    if (exists) return
    useStore.setState({ announcements: [...s.announcements, incoming] })
  }
  if (msg?.type === 'event.add' && msg.payload) {
    const incoming = msg.payload as CalendarEvent
    const s = useStore.getState()
    const exists = s.events.some(e => e.id === incoming.id)
    if (exists) return
    useStore.setState({ events: [...s.events, incoming] })
  }
  if (msg?.type === 'task.add' && msg.payload) {
    const incoming = msg.payload as Task
    const s = useStore.getState()
    const exists = s.tasks.some(t => t.id === incoming.id)
    if (exists) return
    useStore.setState({ tasks: [...s.tasks, incoming] })
  }
  if (msg?.type === 'task.toggle' && msg.payload) {
    const { id, completed } = msg.payload as { id: string; completed: boolean }
    const s = useStore.getState()
    useStore.setState({ tasks: s.tasks.map(t => t.id === id ? { ...t, completed } : t) })
  }
  if (msg?.type === 'list.add' && msg.payload) {
    const incoming = msg.payload as ShoppingList
    const s = useStore.getState()
    const exists = s.lists.some(l => l.id === incoming.id)
    if (exists) return
    useStore.setState({ lists: [...s.lists, incoming] })
  }
  if (msg?.type === 'list.item.add' && msg.payload) {
    const { listId, item } = msg.payload as { listId: string; item: ShoppingItem }
    const s = useStore.getState()
    useStore.setState({ lists: s.lists.map(l => l.id === listId ? { ...l, items: [...l.items, item] } : l) })
  }
  if (msg?.type === 'list.item.toggle' && msg.payload) {
    const { listId, itemId, checked } = msg.payload as { listId: string; itemId: string; checked: boolean }
    const s = useStore.getState()
    useStore.setState({ lists: s.lists.map(l => l.id === listId ? { ...l, items: l.items.map(it => it.id === itemId ? { ...it, checked } : it) } : l) })
  }
  if (msg?.type === 'trip.add' && msg.payload) {
    const incoming = msg.payload as Trip
    const s = useStore.getState()
    const exists = s.trips.some(t => t.id === incoming.id)
    if (exists) return
    useStore.setState({ trips: [...s.trips, incoming] })
  }
  if (msg?.type === 'itinerary.add' && msg.payload) {
    const incoming = msg.payload as ItineraryItem
    const s = useStore.getState()
    const exists = s.itinerary.some(i => i.id === incoming.id)
    if (exists) return
    useStore.setState({ itinerary: [...s.itinerary, incoming] })
  }
  if (msg?.type === 'packing.add' && msg.payload) {
    const incoming = msg.payload as PackingItem
    const s = useStore.getState()
    const exists = s.packing.some(p => p.id === incoming.id)
    if (exists) return
    useStore.setState({ packing: [...s.packing, incoming] })
  }
  if (msg?.type === 'packing.toggle' && msg.payload) {
    const { id, packed } = msg.payload as { id: string; packed: boolean }
    const s = useStore.getState()
    useStore.setState({ packing: s.packing.map(p => p.id === id ? { ...p, packed } : p) })
  }
  if (msg?.type === 'budget.add' && msg.payload) {
    const incoming = msg.payload as BudgetEntry
    const s = useStore.getState()
    const exists = s.budgets.some(b => b.id === incoming.id)
    if (exists) return
    useStore.setState({ budgets: [...s.budgets, incoming] })
  }
  if (msg?.type === 'document.add' && msg.payload) {
    const incoming = msg.payload as DocumentItem
    const s = useStore.getState()
    const exists = s.documents.some(d => d.id === incoming.id)
    if (exists) return
    useStore.setState({ documents: [incoming, ...s.documents] })
  }
  if (msg?.type === 'photo.add' && msg.payload) {
    const incoming = msg.payload as PhotoItem
    const s = useStore.getState()
    const exists = s.photos.some(p => p.id === incoming.id)
    if (exists) return
    useStore.setState({ photos: [incoming, ...s.photos] })
  }
  if (msg?.type === 'album.add' && msg.payload) {
    const incoming = msg.payload as Album
    const s = useStore.getState()
    const exists = s.albums.some(a => a.id === incoming.id)
    if (exists) return
    useStore.setState({ albums: [incoming, ...s.albums] })
  }
  if (msg?.type === 'album.update' && msg.payload) {
    const { id, patch } = msg.payload as { id: string; patch: Partial<Album> }
    const s = useStore.getState()
    useStore.setState({ albums: s.albums.map(a => a.id === id ? { ...a, ...patch } : a) })
  }
  if (msg?.type === 'memory.add' && msg.payload) {
    const incoming = msg.payload as MemoryItem
    const s = useStore.getState()
    const exists = s.memories.some(m => m.id === incoming.id)
    if (exists) return
    useStore.setState({ memories: [incoming, ...s.memories] })
  }
  if (msg?.type === 'memory.update' && msg.payload) {
    const { id, patch } = msg.payload as { id: string; patch: Partial<MemoryItem> }
    const s = useStore.getState()
    useStore.setState({ memories: s.memories.map(m => m.id === id ? { ...m, ...patch } : m) })
  }
  if (msg?.type === 'poll.add' && msg.payload) {
    const incoming = msg.payload as Poll
    const s = useStore.getState()
    const exists = s.polls.some(p => p.id === incoming.id)
    if (exists) return
    useStore.setState({ polls: [incoming, ...s.polls] })
  }
  if (msg?.type === 'poll.vote' && msg.payload) {
    const { pollId, optionId, memberId } = msg.payload as { pollId: string; optionId: string; memberId: string }
    const s = useStore.getState()
    useStore.setState({
      polls: s.polls.map(p => p.id === pollId ? {
        ...p,
        options: p.options.map(opt => opt.id === optionId ? { ...opt, votes: Array.from(new Set([...(opt.votes || []), memberId])) } : opt)
      } : p)
    })
  }
})