/**
 * Theme Service - Manages IDE themes
 */

export interface Theme {
  id: string
  name: string
  type: 'dark' | 'light'
  colors: ThemeColors
}

export interface ThemeColors {
  // Background
  bg: string
  surface: string
  editor: string
  sidebar: string
  terminal: string
  chat: string

  // Borders
  border: string
  borderLight: string

  // Text
  text: string
  textMuted: string
  textDim: string

  // Accent colors
  accent: string
  accentHover: string
  accentFg: string

  // Status colors
  success: string
  warning: string
  error: string
  info: string

  // Syntax colors
  syntaxKeyword: string
  syntaxString: string
  syntaxNumber: string
  syntaxFunction: string
  syntaxVariable: string
  syntaxComment: string
  syntaxType: string
  syntaxOperator: string

  // UI colors
  selection: string
  lineNumber: string
  cursor: string
  indentGuide: string
}

const THEMES: Theme[] = [
  {
    id: 'idexal-dark',
    name: 'Idexal Dark',
    type: 'dark',
    colors: {
      bg: '#0d1117',
      surface: '#161b22',
      editor: '#0d1117',
      sidebar: '#0d1117',
      terminal: '#0d1117',
      chat: '#161b22',
      border: '#30363d',
      borderLight: '#21262d',
      text: '#c9d1d9',
      textMuted: '#8b949e',
      textDim: '#484f58',
      accent: '#58a6ff',
      accentHover: '#79c0ff',
      accentFg: '#ffffff',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149',
      info: '#58a6ff',
      syntaxKeyword: '#ff7b72',
      syntaxString: '#a5d6ff',
      syntaxNumber: '#79c0ff',
      syntaxFunction: '#d2a8ff',
      syntaxVariable: '#ffa657',
      syntaxComment: '#6a737d',
      syntaxType: '#ffa657',
      syntaxOperator: '#ff7b72',
      selection: '#264f7860',
      lineNumber: '#484f58',
      cursor: '#58a6ff',
      indentGuide: '#21262d',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai Pro',
    type: 'dark',
    colors: {
      bg: '#2d2a2e',
      surface: '#403e41',
      editor: '#2d2a2e',
      sidebar: '#2d2a2e',
      terminal: '#2d2a2e',
      chat: '#403e41',
      border: '#5b595c',
      borderLight: '#403e41',
      text: '#fcfcfa',
      textMuted: '#939293',
      textDim: '#5b595c',
      accent: '#a9dc76',
      accentHover: '#c3e88d',
      accentFg: '#2d2a2e',
      success: '#a9dc76',
      warning: '#ffd866',
      error: '#ff6188',
      info: '#78dce8',
      syntaxKeyword: '#ff6188',
      syntaxString: '#ffd866',
      syntaxNumber: '#ab9df2',
      syntaxFunction: '#a9dc76',
      syntaxVariable: '#fc9867',
      syntaxComment: '#727072',
      syntaxType: '#78dce8',
      syntaxOperator: '#ff6188',
      selection: '#5b595c60',
      lineNumber: '#5b595c',
      cursor: '#a9dc76',
      indentGuide: '#403e41',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    type: 'dark',
    colors: {
      bg: '#282a36',
      surface: '#343746',
      editor: '#282a36',
      sidebar: '#282a36',
      terminal: '#282a36',
      chat: '#343746',
      border: '#44475a',
      borderLight: '#343746',
      text: '#f8f8f2',
      textMuted: '#6272a4',
      textDim: '#44475a',
      accent: '#bd93f9',
      accentHover: '#d4acff',
      accentFg: '#282a36',
      success: '#50fa7b',
      warning: '#f1fa8c',
      error: '#ff5555',
      info: '#8be9fd',
      syntaxKeyword: '#ff79c6',
      syntaxString: '#f1fa8c',
      syntaxNumber: '#bd93f9',
      syntaxFunction: '#50fa7b',
      syntaxVariable: '#f8f8f2',
      syntaxComment: '#6272a4',
      syntaxType: '#8be9fd',
      syntaxOperator: '#ff79c6',
      selection: '#44475a60',
      lineNumber: '#6272a4',
      cursor: '#f8f8f2',
      indentGuide: '#44475a',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    type: 'dark',
    colors: {
      bg: '#2e3440',
      surface: '#3b4252',
      editor: '#2e3440',
      sidebar: '#2e3440',
      terminal: '#2e3440',
      chat: '#3b4252',
      border: '#434c5e',
      borderLight: '#3b4252',
      text: '#eceff4',
      textMuted: '#4c566a',
      textDim: '#434c5e',
      accent: '#88c0d0',
      accentHover: '#8fbcbb',
      accentFg: '#2e3440',
      success: '#a3be8c',
      warning: '#ebcb8b',
      error: '#bf616a',
      info: '#5e81ac',
      syntaxKeyword: '#81a1c1',
      syntaxString: '#a3be8c',
      syntaxNumber: '#b48ead',
      syntaxFunction: '#88c0d0',
      syntaxVariable: '#d8dee9',
      syntaxComment: '#4c566a',
      syntaxType: '#8fbcbb',
      syntaxOperator: '#81a1c1',
      selection: '#434c5e60',
      lineNumber: '#4c566a',
      cursor: '#d8dee9',
      indentGuide: '#3b4252',
    },
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    type: 'light',
    colors: {
      bg: '#ffffff',
      surface: '#f6f8fa',
      editor: '#ffffff',
      sidebar: '#f6f8fa',
      terminal: '#f6f8fa',
      chat: '#f6f8fa',
      border: '#d0d7de',
      borderLight: '#e8ebef',
      text: '#24292f',
      textMuted: '#57606a',
      textDim: '#8c959f',
      accent: '#0969da',
      accentHover: '#0550ae',
      accentFg: '#ffffff',
      success: '#1a7f37',
      warning: '#9a6700',
      error: '#cf222e',
      info: '#0969da',
      syntaxKeyword: '#cf222e',
      syntaxString: '#0a3069',
      syntaxNumber: '#0550ae',
      syntaxFunction: '#8250df',
      syntaxVariable: '#953800',
      syntaxComment: '#6e7781',
      syntaxType: '#0550ae',
      syntaxOperator: '#cf222e',
      selection: '#0969da20',
      lineNumber: '#8c959f',
      cursor: '#0969da',
      indentGuide: '#d0d7de',
    },
  },
]

class ThemeService {
  private themes: Map<string, Theme> = new Map()
  private currentThemeId: string = 'idexal-dark'

  constructor() {
    THEMES.forEach(theme => this.themes.set(theme.id, theme))
  }

  /**
   * Get all available themes
   */
  getAll(): Theme[] {
    return Array.from(this.themes.values())
  }

  /**
   * Get theme by ID
   */
  getTheme(id: string): Theme | undefined {
    return this.themes.get(id)
  }

  /**
   * Get current theme
   */
  getCurrent(): Theme {
    return this.themes.get(this.currentThemeId) || THEMES[0]
  }

  /**
   * Set current theme
   */
  setTheme(id: string) {
    if (this.themes.has(id)) {
      this.currentThemeId = id
      this.applyTheme(this.themes.get(id)!)
      localStorage.setItem('idexal-theme', id)
    }
  }

  /**
   * Load saved theme
   */
  loadSaved() {
    const saved = localStorage.getItem('idexal-theme')
    if (saved && this.themes.has(saved)) {
      this.setTheme(saved)
    }
  }

  /**
   * Apply theme to CSS variables
   */
  private applyTheme(theme: Theme) {
    const root = document.documentElement
    const colors = theme.colors

    // Apply all colors as CSS variables
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--ide-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      root.style.setProperty(cssVar, value)
    })

    // Set theme type
    root.setAttribute('data-theme', theme.type)
  }

  /**
   * Get dark themes
   */
  getDarkThemes(): Theme[] {
    return this.getAll().filter(t => t.type === 'dark')
  }

  /**
   * Get light themes
   */
  getLightThemes(): Theme[] {
    return this.getAll().filter(t => t.type === 'light')
  }
}

export const themeService = new ThemeService()
export default themeService
