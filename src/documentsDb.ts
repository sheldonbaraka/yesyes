// Minimal IndexedDB helper for storing and retrieving file blobs
const DB_NAME = 'ufp-docs'
const STORE_NAME = 'files'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveFileBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put({ id, blob })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getFileBlob(id: string): Promise<Blob | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result?.blob ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function makeDownloadUrl(id: string): Promise<string | null> {
  const blob = await getFileBlob(id)
  if (!blob) return null
  return URL.createObjectURL(blob)
}