import { useStore } from '../store'
import { saveFileBlob, makeDownloadUrl } from '../documentsDb'
import { useState } from 'react'
import { format } from 'date-fns'

export default function Documents() {
  const { documents, addDocument, members } = useStore()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const meta = addDocument({ name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size })
        await saveFileBlob(meta.id, file)
      }
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(id: string) {
    const url = await makeDownloadUrl(id)
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = documents.find(d => d.id === id)?.name || 'download'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer">
          <input type="file" multiple className="hidden" onChange={(e)=>onFilesSelected(e.target.files)} />
          <span className="text-sm">Upload Files</span>
        </label>
      </div>

      {error && <div className="p-2 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">{error}</div>}
      {uploading && <div className="text-sm text-gray-700 dark:text-gray-300">Uploading…</div>}

      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-950">
        <h2 className="font-medium mb-2">Shared Library</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">No documents uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2">Name</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Size</th>
                  <th className="py-2">Uploaded</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2">{doc.name}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-300">{doc.mimeType}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-300">{Math.round(doc.size/1024)} KB</td>
                    <td className="py-2 text-gray-600 dark:text-gray-300">{format(new Date(doc.createdAt), 'MMM d, HH:mm')}</td>
                    <td className="py-2">
                      <button className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700" onClick={()=>handleDownload(doc.id)}>Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Uploaded files are available to all members and can be downloaded on any tab. Cross-device realtime requires configuring a WebSocket endpoint.</p>
      </div>
    </div>
  )
}