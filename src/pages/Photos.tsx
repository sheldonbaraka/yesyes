import { useStore } from '../store'
import { useState } from 'react'
import { saveFileBlob, makeDownloadUrl } from '../documentsDb'
import { format } from 'date-fns'

export default function Photos() {
  const { photos, albums, memories, addPhoto, updatePhoto, addAlbum, updateAlbum, addMemory, updateMemory, members, currentMemberId } = useStore()
  const [albumName, setAlbumName] = useState('')
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null)
  const [editingAlbumName, setEditingAlbumName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedForMemory, setSelectedForMemory] = useState<Record<string, boolean>>({})
  const [memTitle, setMemTitle] = useState('')
  const [memDesc, setMemDesc] = useState('')
  const [memDate, setMemDate] = useState('')
  const me = members.find(m => m.id === currentMemberId)

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const item = addPhoto({
          name: file.name,
          mimeType: file.type,
          size: file.size,
          uploadedBy: me?.id,
        })
        await saveFileBlob(item.id, file)
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function createAlbum() {
    const name = albumName.trim()
    if (!name) return
    const a = addAlbum({ name })
    setAlbumName('')
    setEditingAlbumId(a.id)
    setEditingAlbumName(a.name)
  }

  function startEditAlbum(id: string, name: string) {
    setEditingAlbumId(id)
    setEditingAlbumName(name)
  }

  function saveEditAlbum() {
    if (!editingAlbumId) return
    updateAlbum(editingAlbumId, { name: editingAlbumName.trim() || 'Untitled Album' })
    setEditingAlbumId(null)
    setEditingAlbumName('')
  }

  async function downloadPhoto(id: string) {
    const url = await makeDownloadUrl(id)
    if (!url) return alert('File not found')
    const a = document.createElement('a')
    a.href = url
    a.download = photos.find(p => p.id === id)?.name || 'photo'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function toggleSelectForMemory(id: string) {
    setSelectedForMemory((s) => ({ ...s, [id]: !s[id] }))
  }

  function createMemory() {
    const title = memTitle.trim()
    if (!title) return
    const photoIds = Object.entries(selectedForMemory).filter(([,v])=>v).map(([k])=>k)
    const m = addMemory({ title, description: memDesc || undefined, date: memDate || undefined, photoIds })
    setMemTitle('')
    setMemDesc('')
    setMemDate('')
    setSelectedForMemory({})
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Photos & Memories</h1>

      <div className="flex items-center gap-2">
        <input type="file" multiple accept="image/*" onChange={onUpload} />
        {uploading && <span className="text-sm text-gray-600">Uploading…</span>}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="p-4 border rounded bg-white dark:bg-gray-950 lg:col-span-1">
          <h2 className="font-medium mb-2">Albums</h2>
          <div className="flex gap-2">
            <input className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="New album name" value={albumName} onChange={e=>setAlbumName(e.target.value)} />
          <button className="px-3 py-2 rounded btn-primary" onClick={createAlbum}>Create</button>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {albums.length === 0 ? <li className="text-gray-600">No albums yet.</li> : albums.map(a => (
              <li key={a.id} className="flex items-center gap-2">
                {editingAlbumId === a.id ? (
                  <>
                    <input className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={editingAlbumName} onChange={e=>setEditingAlbumName(e.target.value)} />
                    <button className="px-2 py-1 rounded border" onClick={saveEditAlbum}>Save</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1">{a.name}</span>
                    <span className="text-xs text-gray-600">{photos.filter(p=>p.albumId===a.id).length} photos</span>
                    <button className="px-2 py-1 rounded border" onClick={()=>startEditAlbum(a.id, a.name)}>Edit</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border rounded bg-white dark:bg-gray-950 lg:col-span-2">
          <h2 className="font-medium mb-2">Photos</h2>
          {photos.length === 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">No photos uploaded yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map(p => (
                <div key={p.id} className="border rounded p-2 bg-gray-50 dark:bg-gray-900">
                  <div className="text-sm font-medium truncate">{p.title || p.name}</div>
                  <div className="text-xs text-gray-600">{format(new Date(p.createdAt), 'MMM d, HH:mm')}</div>
                  <div className="mt-2 flex gap-2 items-center">
                    <select className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={p.albumId || ''} onChange={e=>updatePhoto(p.id, { albumId: e.target.value || undefined })}>
                      <option value="">No album</option>
                      {albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button className="px-2 py-1 rounded border" onClick={()=>downloadPhoto(p.id)}>Download</button>
                  </div>
                  <div className="mt-2 flex gap-2 items-center">
                    <input className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Add a title" value={p.title || ''} onChange={e=>updatePhoto(p.id, { title: e.target.value })} />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!selectedForMemory[p.id]} onChange={()=>toggleSelectForMemory(p.id)} /> Add to memory</label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 border rounded bg-white dark:bg-gray-950">
          <h2 className="font-medium mb-2">Create Memory</h2>
          <div className="space-y-2">
            <input className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Title" value={memTitle} onChange={e=>setMemTitle(e.target.value)} />
            <input className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" type="date" value={memDate} onChange={e=>setMemDate(e.target.value)} />
            <textarea className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Description" value={memDesc} onChange={e=>setMemDesc(e.target.value)} />
          <button className="px-3 py-2 rounded btn-primary" onClick={createMemory}>Create Memory</button>
            <p className="text-xs text-gray-600">Selected photos: {Object.values(selectedForMemory).filter(Boolean).length}</p>
          </div>
        </div>
        <div className="p-4 border rounded bg-white dark:bg-gray-950">
          <h2 className="font-medium mb-2">Memories</h2>
          {memories.length === 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">No memories yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {memories.map(m => (
                <li key={m.id} className="border rounded p-2">
                  <div className="flex items-center gap-2">
                    <input className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={m.title} onChange={e=>updateMemory(m.id, { title: e.target.value })} />
                    <input className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" type="date" value={m.date || ''} onChange={e=>updateMemory(m.id, { date: e.target.value || undefined })} />
                  </div>
                  <textarea className="mt-2 w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={m.description || ''} onChange={e=>updateMemory(m.id, { description: e.target.value || undefined })} />
                  <div className="mt-2 text-xs text-gray-600">{m.photoIds.length} photos</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}