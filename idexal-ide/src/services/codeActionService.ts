import { fileSystemService } from './fileSystemService'

export interface CodeChange {
  filePath: string
  type: 'create' | 'edit' | 'delete'
  content?: string
  startLine?: number
  endLine?: number
  description: string
}

export interface CodeAction {
  id: string
  changes: CodeChange[]
  description: string
  timestamp: number
  applied: boolean
}

export interface ParsedCodeBlock {
  language: string
  filePath?: string
  content: string
  action?: 'create' | 'edit' | 'apply'
}

class CodeActionService {
  private pendingActions: Map<string, CodeAction> = new Map()

  parseCodeBlocks(response: string): ParsedCodeBlock[] {
    const blocks: ParsedCodeBlock[] = []
    const regex = /```(\w+)?\s*(?:filename=([^\s\n]+))?\s*\n([\s\S]*?)```/g
    let match

    while ((match = regex.exec(response)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        filePath: match[2],
        content: match[3].trim(),
      })
    }

    // Also parse inline code blocks with file references
    const inlineRegex = /(?:File|Create|Edit):\s*`([^`]+)`\s*\n```(\w+)?\s*\n([\s\S]*?)```/g
    while ((match = inlineRegex.exec(response)) !== null) {
      blocks.push({
        language: match[2] || 'text',
        filePath: match[1],
        content: match[3].trim(),
        action: 'create',
      })
    }

    return blocks
  }

  createAction(blocks: ParsedCodeBlock[], description: string): CodeAction {
    const changes: CodeChange[] = blocks.map(block => ({
      filePath: block.filePath || 'untitled',
      type: block.action === 'create' ? 'create' : 'edit',
      content: block.content,
      description: `Apply ${block.language} code`,
    }))

    const action: CodeAction = {
      id: `action-${Date.now()}`,
      changes,
      description,
      timestamp: Date.now(),
      applied: false,
    }

    this.pendingActions.set(action.id, action)
    return action
  }

  async applyAction(actionId: string): Promise<boolean> {
    const action = this.pendingActions.get(actionId)
    if (!action) return false

    try {
      for (const change of action.changes) {
        if (change.type === 'create' && change.content) {
          await fileSystemService.writeFile(change.filePath, change.content)
        } else if (change.type === 'edit' && change.content) {
          // For edits, we'd need to read existing content and apply patches
          // For now, overwrite
          await fileSystemService.writeFile(change.filePath, change.content)
        }
      }

      action.applied = true
      this.pendingActions.delete(actionId)
      return true
    } catch (error) {
      console.error('Failed to apply action:', error)
      return false
    }
  }

  getPendingActions(): CodeAction[] {
    return Array.from(this.pendingActions.values())
  }

  cancelAction(actionId: string): boolean {
    return this.pendingActions.delete(actionId)
  }
}

export const codeActionService = new CodeActionService()
export default codeActionService
