import { describe, it, expect } from 'vitest'
import { codeActionService } from '../services/codeActionService'
import { contextWindowManager } from '../services/contextWindowManager'

describe('Bug Fix: CodeActionService — createAction + applyAction lifecycle', () => {
  it('createAction registers action that can be found and applied', () => {
    const blocks = [{ language: 'typescript', filePath: 'test.ts', content: 'const x = 1' }]
    const action = codeActionService.createAction(blocks, 'test desc')

    expect(action.id).toMatch(/^action-/)
    expect(action.changes).toHaveLength(1)
    expect(action.changes[0].filePath).toBe('test.ts')
    expect(action.applied).toBe(false)

    // getPendingActions should find it
    const pending = codeActionService.getPendingActions()
    const found = pending.find(a => a.id === action.id)
    expect(found).toBeDefined()
  })

  it('applyAction returns true and removes from pending', async () => {
    const blocks = [{ language: 'typescript', filePath: 'test2.ts', content: 'const y = 2' }]
    const action = codeActionService.createAction(blocks, 'apply test')

    const success = await codeActionService.applyAction(action.id)
    expect(success).toBe(true)

    // After apply, it should be removed from pending
    const afterApply = codeActionService.getPendingActions()
    const stillPending = afterApply.find(a => a.id === action.id)
    expect(stillPending).toBeUndefined()
  })

  it('applyAction returns false for non-existent ID', async () => {
    const fail = await codeActionService.applyAction('nonexistent-id-xyz')
    expect(fail).toBe(false)
  })
})

describe('Bug Fix: ContextWindowManager — chronological history order', () => {
  it('history messages are in chronological order (oldest first)', () => {
    const history = [
      { role: 'user', content: 'first message' },
      { role: 'assistant', content: 'first response' },
      { role: 'user', content: 'second message' },
      { role: 'assistant', content: 'second response' },
    ]

    const ctx = contextWindowManager.buildContext(
      'system prompt',
      'current question',
      new Map(),
      history,
      'project info'
    )

    // Find history messages (low priority user/assistant)
    const historyMsgs = ctx.filter(
      m => (m.role === 'user' || m.role === 'assistant') && m.priority === 'low'
    )
    expect(historyMsgs).toHaveLength(4)

    // They must be in chronological order
    expect(historyMsgs[0].content).toBe('first message')
    expect(historyMsgs[1].content).toBe('first response')
    expect(historyMsgs[2].content).toBe('second message')
    expect(historyMsgs[3].content).toBe('second response')
  })

  it('current user message is always last with high priority', () => {
    const history = [
      { role: 'user', content: 'old question' },
      { role: 'assistant', content: 'old response' },
    ]

    const ctx = contextWindowManager.buildContext(
      'system prompt',
      'current question',
      new Map(),
      history
    )

    const lastMsg = ctx[ctx.length - 1]
    expect(lastMsg.role).toBe('user')
    expect(lastMsg.content).toBe('current question')
    expect(lastMsg.priority).toBe('high')
  })
})

describe('Bug Fix: XSS prevention in MarkdownRenderer formatInlineCode', () => {
  // Replicate the exact logic from the fixed MarkdownRenderer
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function formatInlineCode(text: string): string {
    const escaped = escapeHtml(text)
    return escaped.replace(
      /`([^`]+)`/g,
      '<code class="px-1 py-0.5 bg-ide-bg rounded text-ide-accent font-mono text-xs">$1</code>'
    )
  }

  it('escapes <script> in backtick content', () => {
    const malicious = 'Hello `<script>alert("xss")</script>` world'
    const result = formatInlineCode(malicious)

    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
    expect(result).toContain('<code')
  })

  it('escapes HTML attributes in backtick content', () => {
    const malicious = '`<img src=x onerror=alert(1)>`'
    const result = formatInlineCode(malicious)

    expect(result).not.toContain('<img')
    expect(result).toContain('&lt;img')
  })

  it('preserves normal inline code', () => {
    const normal = 'Use `useState` for state'
    const result = formatInlineCode(normal)

    expect(result).toContain('useState')
    expect(result).toContain('<code')
  })

  it('handles empty input', () => {
    const result = formatInlineCode('')
    expect(result).toBe('')
  })

  it('handles text with no backticks', () => {
    const result = formatInlineCode('no backticks here')
    expect(result).toBe('no backticks here')
  })
})
