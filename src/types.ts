export type Role = 'admin' | 'adult' | 'teen' | 'child' | 'extended'

export interface Member {
  id: string
  name: string
  role: Role
  email?: string
  passwordHash?: string
}

export interface EventCategory {
  id: string
  name: string
  color: string
}

export interface CalendarEvent {
  id: string
  title: string
  date: string // ISO date
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  location?: string
  notes?: string
  memberId?: string
  categoryId?: string
}

export interface Task {
  id: string
  title: string
  assigneeId?: string
  dueDate?: string
  completed: boolean
}

export interface ShoppingList {
  id: string
  name: string
  store?: string
  items: ShoppingItem[]
}

export interface ShoppingItem {
  id: string
  name: string
  category?: string
  quantity?: number
  checked: boolean
}

export interface Trip {
  id: string
  title: string
  destination?: string
  startDate?: string
  endDate?: string
}

export interface ItineraryItem {
  id: string
  tripId: string
  type: 'flight' | 'train' | 'activity' | 'hotel' | 'car'
  date: string
  time?: string
  title: string
  location?: string
  notes?: string
}

export interface PackingItem {
  id: string
  tripId: string
  assigneeId?: string
  name: string
  qty?: number
  packed: boolean
}

export interface BudgetEntry {
  id: string
  tripId?: string
  category: string
  amount: number
  currency: string
  date: string
}

// Meals & Pantry
export interface MealPlan {
  id: string
  date: string // ISO date
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  title: string
  notes?: string
  serves?: number
}

export interface PantryItem {
  id: string
  name: string
  qty?: number
  unit?: string
  category?: string
}

export interface RecipeIngredient {
  name: string
  qty?: number
  unit?: string
}

export interface Recipe {
  id: string
  name: string
  ingredients: RecipeIngredient[]
  instructions?: string
}

// Finance
export type AccountType = 'cash' | 'bank' | 'card' | 'wallet'

export interface FinanceAccount {
  id: string
  name: string
  type: AccountType
}

export type TransactionType = 'income' | 'expense' | 'transfer'

export interface FinanceTransaction {
  id: string
  accountId: string
  date: string
  type: TransactionType
  amount: number
  category?: string
  note?: string
}

export interface RecurringBill {
  id: string
  name: string
  amount: number
  dayOfMonth: number
  accountId?: string
  category?: string
  active: boolean
}

export interface AppState {
  members: Member[]
  categories: EventCategory[]
  events: CalendarEvent[]
  tasks: Task[]
  lists: ShoppingList[]
  mealPlans: MealPlan[]
  pantry: PantryItem[]
  recipes: Recipe[]
  accounts: FinanceAccount[]
  transactions: FinanceTransaction[]
  recurringBills: RecurringBill[]
  trips: Trip[]
  itinerary: ItineraryItem[]
  packing: PackingItem[]
  budgets: BudgetEntry[]
  documents: DocumentItem[]
  photos: PhotoItem[]
  albums: Album[]
  memories: MemoryItem[]
  announcements: Announcement[]
  activity: ActivityItem[]
  chatMessages: ChatMessage[]
  polls: Poll[]
  currentMemberId?: string
}

export interface Announcement {
  id: string
  text: string
  urgent?: boolean
  createdAt: string
}

export interface ActivityItem {
  id: string
  type: 'event' | 'task' | 'list' | 'trip' | 'itinerary' | 'packing' | 'budget'
  message: string
  createdAt: string
}

export interface DocumentItem {
  id: string
  name: string
  mimeType: string
  size: number
  uploadedBy?: string // memberId
  createdAt: string
}

export interface PhotoItem {
  id: string
  name: string
  mimeType: string
  size: number
  uploadedBy?: string // memberId
  createdAt: string
  albumId?: string
  title?: string
}

export interface Album {
  id: string
  name: string
  description?: string
  coverPhotoId?: string
  createdAt: string
}

export interface MemoryItem {
  id: string
  title: string
  description?: string
  date?: string
  photoIds: string[]
  createdAt: string
}

export interface ChatMessage {
  id: string
  senderId: string
  text: string
  createdAt: string
  deliveredBy?: string[]
  readBy?: string[]
}

export interface PollOption {
  id: string
  text: string
  votes: string[] // memberIds
}

export interface Poll {
  id: string
  question: string
  options: PollOption[]
  createdAt: string
}