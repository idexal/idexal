import { useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, TableWrap, Td } from '@/components/ui/primitives'
import { useUiStore } from '@/stores/uiStore'

type CStatus = 'published' | 'draft' | 'review'

interface ContentRow {
  id: string
  title: string
  type: 'blog' | 'docs' | 'page'
  status: CStatus
  author: string
  updated: string
  views: number
}

const INITIAL: ContentRow[] = [
  { id: 'c1', title: 'Introducing Idexal IDE 1.0', type: 'blog', status: 'published', author: 'Team', updated: 'Aug 20', views: 8420 },
  { id: 'c2', title: 'Inside the Rust Engine', type: 'blog', status: 'published', author: 'Layla', updated: 'Aug 12', views: 5210 },
  { id: 'c3', title: 'Roadmap H2 2026', type: 'blog', status: 'review', author: 'Yousef', updated: 'Yesterday', views: 0 },
  { id: 'c4', title: 'API Reference', type: 'docs', status: 'published', author: 'Team', updated: 'Aug 25', views: 3390 },
  { id: 'c5', title: 'Plugin Development Guide', type: 'docs', status: 'draft', author: 'Nadia', updated: 'Aug 18', views: 0 },
]

export function AdminContentPage() {
  const toast = useUiStore((s) => s.toast)
  const [rows, setRows] = useState(INITIAL)
  const [editing, setEditing] = useState<ContentRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftType, setDraftType] = useState<ContentRow['type']>('blog')

  const setStatus = (id: string, status: CStatus) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, status, updated: 'Just now' } : r)))
    toast(`Status → ${status}`, 'success')
  }

  const remove = (id: string, title: string) => {
    setRows(rows.filter((r) => r.id !== id))
    toast(`"${title}" deleted`, 'success')
  }

  const create = () => {
    if (!draftTitle.trim()) {
      toast('Title is required', 'error')
      return
    }
    setRows([{ id: `c${Date.now()}`, title: draftTitle.trim(), type: draftType, status: 'draft', author: 'Admin', updated: 'Just now', views: 0 }, ...rows])
    setDraftTitle('')
    setCreating(false)
    toast('Draft created — open it to edit', 'success')
  }

  return (
    <>
      <PageHeader
        title="Content Management"
        desc="Blog posts, docs and pages — publish, review or draft."
        actions={<button className="btn btn-primary" onClick={() => setCreating(!creating)}><FaIcon icon="fa-plus" className="h-4 w-4" /> New content</button>}
      />

      {(creating || editing) && (
        <Card className="mb-4 space-y-4 p-6">
          <h3 className="font-bold">{editing ? `Edit: ${editing.title}` : 'New content'}</h3>
          {!editing && (
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <label className="block text-sm font-medium">
                Title
                <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Post or page title" className="input mt-1.5" />
              </label>
              <label className="block text-sm font-medium">
                Type
                <select value={draftType} onChange={(e) => setDraftType(e.target.value as ContentRow['type'])} className="input mt-1.5">
                  <option value="blog">Blog post</option>
                  <option value="docs">Documentation</option>
                  <option value="page">Static page</option>
                </select>
              </label>
            </div>
          )}
          {editing && (
            <label className="block text-sm font-medium">
              Title
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="input mt-1.5"
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            Body (markdown)
            <textarea rows={6} defaultValue="Write in markdown…" className="input mt-1.5 resize-y font-mono text-xs" />
          </label>
          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() => {
                if (editing) {
                  setRows(rows.map((r) => (r.id === editing.id ? { ...editing, updated: 'Just now' } : r)))
                  toast('Changes saved', 'success')
                  setEditing(null)
                } else {
                  create()
                }
              }}
            >
              <FaIcon icon="fa-floppy-disk" className="h-4 w-4" /> Save
            </button>
            <button className="btn btn-ghost" onClick={() => { setEditing(null); setCreating(false) }}>Cancel</button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <TableWrap head={['Title', 'Type', 'Status', 'Author', 'Updated', 'Views', 'Actions']}>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-[var(--surface-2)]">
              <Td className="max-w-xs truncate font-semibold">{r.title}</Td>
              <Td><Badge color="gray">{r.type}</Badge></Td>
              <Td>
                <select
                  value={r.status}
                  onChange={(e) => setStatus(r.id, e.target.value as CStatus)}
                  className="input w-auto px-2 py-1 text-xs"
                >
                  <option value="published">✅ published</option>
                  <option value="review">👁 review</option>
                  <option value="draft">📝 draft</option>
                </select>
              </Td>
              <Td>{r.author}</Td>
              <Td className="text-xs text-muted">{r.updated}</Td>
              <Td dir="ltr" className="font-mono text-xs">{r.views.toLocaleString()}</Td>
              <Td>
                <div className="flex gap-2 text-xs">
                  <button className="font-semibold text-primary hover:underline" onClick={() => setEditing(r)}>Edit</button>
                  <button className="text-red-500 hover:underline" onClick={() => remove(r.id, r.title)}>Delete</button>
                </div>
              </Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}
