import React, { useState } from 'react'
import {
  FaBox, FaSearch, FaCopy, FaCheck, FaEye, FaCode, FaStar, FaChevronDown, FaChevronRight, FaExternalLinkAlt, FaTh
} from '../Icon'

interface ComponentItem {
  name: string
  category: string
  description: string
  code: string
  props: { name: string; type: string; default: string; description: string }[]
  variants: string[]
  usageCount: number
}

const COMPONENTS: ComponentItem[] = [
  {
    name: 'Button',
    category: 'Forms',
    description: 'Interactive button with multiple variants and sizes',
    code: `<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>`,
    props: [
      { name: 'variant', type: "'primary' | 'secondary' | 'danger' | 'ghost'", default: 'primary', description: 'Visual style' },
      { name: 'size', type: "'sm' | 'md' | 'lg'", default: 'md', description: 'Button size' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable interaction' },
      { name: 'loading', type: 'boolean', default: 'false', description: 'Show loading spinner' },
    ],
    variants: ['primary', 'secondary', 'danger', 'ghost', 'outline'],
    usageCount: 145,
  },
  {
    name: 'Input',
    category: 'Forms',
    description: 'Text input with label, error, and helper text',
    code: `<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={errors.email}
/>`,
    props: [
      { name: 'label', type: 'string', default: '-', description: 'Input label' },
      { name: 'error', type: 'string', default: '-', description: 'Error message' },
      { name: 'helper', type: 'string', default: '-', description: 'Helper text' },
    ],
    variants: ['text', 'password', 'email', 'number', 'search'],
    usageCount: 89,
  },
  {
    name: 'Card',
    category: 'Layout',
    description: 'Container card with header, body, and footer',
    code: `<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content goes here</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>`,
    props: [
      { name: 'elevated', type: 'boolean', default: 'false', description: 'Add shadow' },
      { name: 'bordered', type: 'boolean', default: 'true', description: 'Show border' },
    ],
    variants: ['default', 'elevated', 'outlined', 'flat'],
    usageCount: 67,
  },
  {
    name: 'Modal',
    category: 'Overlay',
    description: 'Dialog modal with backdrop and animations',
    code: `<Modal isOpen={showModal} onClose={() => setShowModal(false)}>
  <Modal.Title>Confirm Action</Modal.Title>
  <Modal.Body>Are you sure?</Modal.Body>
  <Modal.Footer>
    <Button onClick={handleConfirm}>Yes</Button>
  </Modal.Footer>
</Modal>`,
    props: [
      { name: 'isOpen', type: 'boolean', default: 'false', description: 'Show/hide modal' },
      { name: 'size', type: "'sm' | 'md' | 'lg' | 'xl'", default: 'md', description: 'Modal size' },
      { name: 'closeOnBackdrop', type: 'boolean', default: 'true', description: 'Close on backdrop click' },
    ],
    variants: ['default', 'fullscreen', 'drawer', 'alert'],
    usageCount: 34,
  },
  {
    name: 'Table',
    category: 'Data Display',
    description: 'Data table with sorting, filtering, and pagination',
    code: `<Table
  columns={columns}
  data={users}
  sortable
  pagination={{ pageSize: 10 }}
/>`,
    props: [
      { name: 'columns', type: 'Column[]', default: '[]', description: 'Column definitions' },
      { name: 'data', type: 'any[]', default: '[]', description: 'Row data' },
      { name: 'sortable', type: 'boolean', default: 'false', description: 'Enable sorting' },
      { name: 'pagination', type: 'PaginationOptions', default: '-', description: 'Pagination config' },
    ],
    variants: ['default', 'striped', 'compact', 'bordered'],
    usageCount: 52,
  },
  {
    name: 'Toast',
    category: 'Feedback',
    description: 'Notification toast with auto-dismiss',
    code: `<Toast type="success" message="Saved!" duration={3000} />`,
    props: [
      { name: 'type', type: "'success' | 'error' | 'warning' | 'info'", default: 'info', description: 'Toast type' },
      { name: 'message', type: 'string', default: '-', description: 'Toast message' },
      { name: 'duration', type: 'number', default: '5000', description: 'Auto-dismiss ms' },
    ],
    variants: ['success', 'error', 'warning', 'info'],
    usageCount: 28,
  },
  {
    name: 'Tabs',
    category: 'Navigation',
    description: 'Tabbed navigation with content panels',
    code: `<Tabs activeTab={active} onChange={setActive}>
  <Tabs.List>
    <Tabs.Tab value="one">Tab 1</Tabs.Tab>
    <Tabs.Tab value="two">Tab 2</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panels>
    <Tabs.Panel value="one">Content 1</Tabs.Panel>
    <Tabs.Panel value="two">Content 2</Tabs.Panel>
  </Tabs.Panels>
</Tabs>`,
    props: [
      { name: 'activeTab', type: 'string', default: '-', description: 'Active tab value' },
      { name: 'onChange', type: '(tab: string) => void', default: '-', description: 'Tab change handler' },
    ],
    variants: ['default', 'pills', 'underline', 'enclosed'],
    usageCount: 73,
  },
  {
    name: 'Avatar',
    category: 'Data Display',
    description: 'User avatar with fallback initials',
    code: `<Avatar src={user.avatar} name={user.name} size="md" />`,
    props: [
      { name: 'src', type: 'string', default: '-', description: 'Image URL' },
      { name: 'name', type: 'string', default: '-', description: 'Fallback initials' },
      { name: 'size', type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'", default: 'md', description: 'Avatar size' },
    ],
    variants: ['xs', 'sm', 'md', 'lg', 'xl'],
    usageCount: 45,
  },
]

const CATEGORIES = ['All', 'Forms', 'Layout', 'Overlay', 'Data Display', 'Feedback', 'Navigation']

export default function ComponentLibraryPanel({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedComponent, setSelectedComponent] = useState<ComponentItem | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [showCode, setShowCode] = useState(false)

  const filtered = COMPONENTS.filter(c => {
    if (selectedCategory !== 'All' && c.category !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    }
    return true
  })

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 1500)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaBox size={16} className="text-violet-400" />
          <span className="text-sm font-semibold">Component Library</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Search + Categories */}
      <div className="px-3 py-2 space-y-2 border-b border-ide-border">
        <div className="flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
          <FaSearch size={14} className="text-ide-text-secondary mr-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="flex-1 bg-transparent text-xs outline-none placeholder-ide-text-secondary"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 text-xs rounded whitespace-nowrap ${
                selectedCategory === cat ? 'bg-violet-600 text-white' : 'bg-ide-bg-secondary text-ide-text-secondary hover:text-ide-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Component List */}
      <div className="flex-1 overflow-y-auto">
        {selectedComponent ? (
          /* Component Detail */
          <div className="p-3 space-y-3">
            <button onClick={() => setSelectedComponent(null)} className="text-xs text-violet-400 hover:underline">← Back to library</button>
            <h3 className="text-sm font-semibold">{selectedComponent.name}</h3>
            <p className="text-xs text-ide-text-secondary">{selectedComponent.description}</p>

            {/* Preview */}
            <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-4 flex items-center justify-center gap-2">
              {selectedComponent.variants.map((v, i) => (
                <div
                  key={v}
                  className={`px-3 py-1.5 rounded text-xs border ${
                    i === 0 ? 'bg-violet-600 text-white border-violet-600' :
                    i === 1 ? 'bg-ide-bg-secondary text-ide-text border-ide-border' :
                    i === 2 ? 'bg-red-600/20 text-red-400 border-red-600/30' :
                    'text-violet-400 border-violet-600/30'
                  }`}
                >
                  {selectedComponent.name === 'Avatar' ? v.toUpperCase() : v}
                </div>
              ))}
            </div>

            {/* FaCode */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-ide-text-secondary">Usage Example</span>
                <button onClick={() => copyCode(selectedComponent.code)} className="text-xs text-violet-400 flex items-center gap-1">
                  {copiedCode ? <FaCheck size={10} className="text-green-400" /> : <FaCopy size={10} />}
                  {copiedCode ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-ide-bg border border-ide-border rounded p-2 text-xs font-mono overflow-x-auto">
                {selectedComponent.code}
              </pre>
            </div>

            {/* Props */}
            <div>
              <div className="text-xs text-ide-text-secondary mb-1">Props</div>
              <div className="border border-ide-border rounded overflow-hidden">
                <div className="grid grid-cols-4 gap-px bg-ide-border text-xs">
                  <div className="bg-ide-bg-secondary px-2 py-1 font-semibold">Name</div>
                  <div className="bg-ide-bg-secondary px-2 py-1 font-semibold">Type</div>
                  <div className="bg-ide-bg-secondary px-2 py-1 font-semibold">Default</div>
                  <div className="bg-ide-bg-secondary px-2 py-1 font-semibold">Description</div>
                </div>
                {selectedComponent.props.map(prop => (
                  <div key={prop.name} className="grid grid-cols-4 gap-px bg-ide-border text-xs">
                    <div className="bg-ide-bg px-2 py-1 font-mono text-violet-400">{prop.name}</div>
                    <div className="bg-ide-bg px-2 py-1 font-mono text-cyan-400 truncate">{prop.type}</div>
                    <div className="bg-ide-bg px-2 py-1 text-ide-text-secondary">{prop.default}</div>
                    <div className="bg-ide-bg px-2 py-1 text-ide-text-secondary">{prop.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Component Grid */
          <div className="p-3 space-y-2">
            <div className="text-xs text-ide-text-secondary mb-2">{filtered.length} components</div>
            {filtered.map(comp => (
              <div
                key={comp.name}
                onClick={() => setSelectedComponent(comp)}
                className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2 hover:bg-ide-bg-secondary/50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{comp.name}</span>
                  <span className="text-xs text-ide-text-secondary">{comp.category}</span>
                </div>
                <div className="text-xs text-ide-text-secondary truncate">{comp.description}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-ide-text-secondary">
                  <span className="flex items-center gap-0.5"><FaStar size={8} className="text-yellow-400" /> {comp.usageCount}</span>
                  <span>{comp.variants.length} variants</span>
                </div>
                {/* Variant preview */}
                <div className="flex gap-1 mt-2">
                  {comp.variants.slice(0, 4).map((v, i) => (
                    <div
                      key={v}
                      className="w-6 h-6 rounded bg-ide-bg-secondary border border-ide-border flex items-center justify-center text-ide-text-secondary text-[8px]"
                    >
                      {v[0].toUpperCase()}
                    </div>
                  ))}
                  {comp.variants.length > 4 && (
                    <div className="w-6 h-6 rounded bg-ide-bg-secondary border border-ide-border flex items-center justify-center text-ide-text-secondary text-[8px]">
                      +{comp.variants.length - 4}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
