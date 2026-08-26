/**
 * Export/Import Service - Handles exporting and importing settings
 */

export interface ExportData {
  version: string
  timestamp: number
  settings: Record<string, any>
  shortcuts?: Record<string, string>
}

class ExportImportService {
  private version: string = '1.0.0'

  /**
   * Export all settings to JSON
   */
  exportSettings(): string {
    const data: ExportData = {
      version: this.version,
      timestamp: Date.now(),
      settings: this.getAllSettings(),
      shortcuts: this.getCustomShortcuts(),
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * Import settings from JSON
   */
  importSettings(jsonString: string): boolean {
    try {
      const data: ExportData = JSON.parse(jsonString)

      // Validate version
      if (!data.version || !data.settings) {
        throw new Error('Invalid export file format')
      }

      // Apply settings
      this.applySettings(data.settings)

      // Apply custom shortcuts if present
      if (data.shortcuts) {
        this.applyCustomShortcuts(data.shortcuts)
      }

      return true
    } catch (error) {
      console.error('Import failed:', error)
      return false
    }
  }

  /**
   * Export to file and trigger download
   */
  downloadExport(filename?: string) {
    const data = this.exportSettings()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename || `idexal-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Import from file
   */
  async importFromFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        resolve(this.importSettings(content))
      }
      reader.onerror = () => resolve(false)
      reader.readAsText(file)
    })
  }

  /**
   * Get all settings from localStorage
   */
  private getAllSettings(): Record<string, any> {
    const settings: Record<string, any> = {}

    // Get all localStorage keys related to idexal
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('idexal-')) {
        try {
          settings[key] = JSON.parse(localStorage.getItem(key) || '{}')
        } catch {
          settings[key] = localStorage.getItem(key)
        }
      }
    }

    return settings
  }

  /**
   * Apply settings to localStorage
   */
  private applySettings(settings: Record<string, any>) {
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('idexal-')) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
      }
    }
  }

  /**
   * Get custom keyboard shortcuts
   */
  private getCustomShortcuts(): Record<string, string> {
    try {
      const saved = localStorage.getItem('idexal-custom-shortcuts')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  }

  /**
   * Apply custom keyboard shortcuts
   */
  private applyCustomShortcuts(shortcuts: Record<string, string>) {
    localStorage.setItem('idexal-custom-shortcuts', JSON.stringify(shortcuts))
  }

  /**
   * Clear all settings
   */
  clearAll() {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('idexal-')) {
        keys.push(key)
      }
    }
    keys.forEach(key => localStorage.removeItem(key))
  }

  /**
   * Get export size estimate
   */
  getExportSize(): string {
    const data = this.exportSettings()
    const bytes = new Blob([data]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
}

export const exportImportService = new ExportImportService()
export default exportImportService
