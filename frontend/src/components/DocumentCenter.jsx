import { useEffect, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { documentsService } from '../services/api'

const DOC_TYPES = [
  ['commercial_invoice', 'Commercial Invoice'],
  ['packing_list', 'Packing List'],
  ['bill_of_lading', 'Bill of Lading'],
  ['pod', 'Proof of Delivery (POD)'],
  ['customs_declaration', 'Customs Declaration'],
  ['exit_pass', 'Exit Pass'],
  ['photo', 'Photo'],
  ['other', 'Other'],
]

export default function DocumentCenter({ shipmentId }) {
  const [docs, setDocs] = useState([])
  const [docType, setDocType] = useState('commercial_invoice')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    documentsService.list(shipmentId).then(({ data }) => setDocs(data.results ?? data)).catch(() => {})
  }

  useEffect(load, [shipmentId])

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      await documentsService.upload(shipmentId, docType, file)
      load()
    } catch {
      setError('Upload failed. Supported types: PDF, JPG, PNG, DOCX, XLSX.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return
    await documentsService.remove(id).catch(() => {})
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="btn secondary" style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading…' : <><Upload size={15} /> Upload File</>}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" onChange={handleFileChange} style={{ display: 'none' }} disabled={uploading} />
        </label>
      </div>

      {error && <div className="error-text">{error}</div>}

      {docs.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No documents uploaded yet.</div>
      ) : (
        <table>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td style={{ width: 200 }}>{DOC_TYPES.find(([v]) => v === d.doc_type)?.[1] || d.doc_type}</td>
                <td>
                  <a href={d.file} target="_blank" rel="noreferrer" style={{ color: 'var(--signal)' }}>
                    {d.file_name}
                  </a>
                </td>
                <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{new Date(d.uploaded_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(d.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
