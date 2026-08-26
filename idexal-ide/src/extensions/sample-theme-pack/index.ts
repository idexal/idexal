/**
 * Sample Extension: Idexal Theme Pack
 * Demonstrates the theme contribution API.
 *
 * Registers 3 custom themes:
 * - Aurora (dark, green/cyan accents)
 * - Sunset (dark, warm orange/red accents)
 * - Ocean (dark, deep blue accents)
 */

import { defineExtension } from '../../services/pluginSDK'

export default defineExtension({
  manifest: {
    id: 'idexal-sample-theme-pack',
    name: 'Idexal Theme Pack',
    version: '1.0.0',
    description: 'Three beautiful dark themes — Aurora, Sunset, and Ocean',
    author: 'Idexal Team',
    icon: '🎨',
    tags: ['theme', 'dark', 'color'],
    contributes: {
      themes: [
        {
          id: 'idexal-aurora',
          label: 'Aurora',
          type: 'dark',
          colors: {
            'editor.background': '#0a1628',
            'editor.foreground': '#c5d0e6',
            'editorLineNumber.foreground': '#3b4f6b',
            'editorCursor.foreground': '#00e5a0',
            'editor.selectionBackground': '#1a3a5c',
            'editor.lineHighlightBackground': '#0f1f36',
            'editorWidget.background': '#0e1a2e',
            'sideBar.background': '#0a1628',
            'sideBar.foreground': '#8fa4c4',
            'sideBarTitle.foreground': '#c5d0e6',
            'statusBar.background': '#071020',
            'statusBar.foreground': '#5a7da0',
            'titleBar.activeBackground': '#0a1628',
            'tab.activeBackground': '#0a1628',
            'tab.activeForeground': '#c5d0e6',
            'tab.inactiveBackground': '#071020',
            'activityBar.background': '#071020',
            'panel.background': '#0a1628',
            'input.background': '#0f1f36',
            'input.border': '#1a3050',
            'input.foreground': '#c5d0e6',
            'button.background': '#00b87a',
            'button.foreground': '#0a1628',
            'list.hoverBackground': '#0f1f36',
            'scrollbar.shadow': '#00000030',
            'scrollbarSlider.background': '#1a305060',
            'scrollbarSlider.hoverBackground': '#1a3050a0',
          },
          tokenColors: [
            { scope: 'comment', settings: { foreground: '#4a6a8a', fontStyle: 'italic' } },
            { scope: 'keyword', settings: { foreground: '#00e5a0' } },
            { scope: 'string', settings: { foreground: '#7dd3fc' } },
            { scope: 'number', settings: { foreground: '#f0b429' } },
            { scope: 'type', settings: { foreground: '#a78bfa' } },
            { scope: 'function', settings: { foreground: '#60d5fa' } },
            { scope: 'variable', settings: { foreground: '#c5d0e6' } },
            { scope: 'constant', settings: { foreground: '#f0b429' } },
            { scope: 'operator', settings: { foreground: '#00e5a0' } },
            { scope: 'regexp', settings: { foreground: '#f07178' } },
            { scope: 'tag', settings: { foreground: '#00e5a0' } },
            { scope: 'attribute.name', settings: { foreground: '#60d5fa' } },
            { scope: 'attribute.value', settings: { foreground: '#7dd3fc' } },
          ],
        },
        {
          id: 'idexal-sunset',
          label: 'Sunset',
          type: 'dark',
          colors: {
            'editor.background': '#1a1119',
            'editor.foreground': '#e0d0d4',
            'editorLineNumber.foreground': '#5a4550',
            'editorCursor.foreground': '#ff8a65',
            'editor.selectionBackground': '#3a2030',
            'editor.lineHighlightBackground': '#221820',
            'editorWidget.background': '#1e1420',
            'sideBar.background': '#1a1119',
            'sideBar.foreground': '#a08890',
            'sideBarTitle.foreground': '#e0d0d4',
            'statusBar.background': '#140e14',
            'statusBar.foreground': '#7a6070',
            'titleBar.activeBackground': '#1a1119',
            'tab.activeBackground': '#1a1119',
            'tab.activeForeground': '#e0d0d4',
            'tab.inactiveBackground': '#140e14',
            'activityBar.background': '#140e14',
            'panel.background': '#1a1119',
            'input.background': '#221820',
            'input.border': '#3a2030',
            'input.foreground': '#e0d0d4',
            'button.background': '#ff7043',
            'button.foreground': '#1a1119',
            'list.hoverBackground': '#221820',
          },
          tokenColors: [
            { scope: 'comment', settings: { foreground: '#6a5560', fontStyle: 'italic' } },
            { scope: 'keyword', settings: { foreground: '#ff8a65' } },
            { scope: 'string', settings: { foreground: '#a5d6a7' } },
            { scope: 'number', settings: { foreground: '#ffd54f' } },
            { scope: 'type', settings: { foreground: '#ce93d8' } },
            { scope: 'function', settings: { foreground: '#ffab91' } },
            { scope: 'variable', settings: { foreground: '#e0d0d4' } },
            { scope: 'constant', settings: { foreground: '#ffd54f' } },
            { scope: 'operator', settings: { foreground: '#ff8a65' } },
            { scope: 'tag', settings: { foreground: '#ff8a65' } },
            { scope: 'attribute.name', settings: { foreground: '#ffab91' } },
            { scope: 'attribute.value', settings: { foreground: '#a5d6a7' } },
          ],
        },
        {
          id: 'idexal-ocean',
          label: 'Ocean',
          type: 'dark',
          colors: {
            'editor.background': '#0c1426',
            'editor.foreground': '#b8c8e8',
            'editorLineNumber.foreground': '#2a3f66',
            'editorCursor.foreground': '#4fc3f7',
            'editor.selectionBackground': '#142a4c',
            'editor.lineHighlightBackground': '#0e1a30',
            'editorWidget.background': '#0e1a30',
            'sideBar.background': '#0c1426',
            'sideBar.foreground': '#6888b0',
            'sideBarTitle.foreground': '#b8c8e8',
            'statusBar.background': '#08101e',
            'statusBar.foreground': '#4a6a90',
            'titleBar.activeBackground': '#0c1426',
            'tab.activeBackground': '#0c1426',
            'tab.activeForeground': '#b8c8e8',
            'tab.inactiveBackground': '#08101e',
            'activityBar.background': '#08101e',
            'panel.background': '#0c1426',
            'input.background': '#0e1a30',
            'input.border': '#142a4c',
            'input.foreground': '#b8c8e8',
            'button.background': '#2196f3',
            'button.foreground': '#ffffff',
            'list.hoverBackground': '#0e1a30',
          },
          tokenColors: [
            { scope: 'comment', settings: { foreground: '#3a5580', fontStyle: 'italic' } },
            { scope: 'keyword', settings: { foreground: '#4fc3f7' } },
            { scope: 'string', settings: { foreground: '#81c784' } },
            { scope: 'number', settings: { foreground: '#ffb74d' } },
            { scope: 'type', settings: { foreground: '#ba68c8' } },
            { scope: 'function', settings: { foreground: '#4dd0e1' } },
            { scope: 'variable', settings: { foreground: '#b8c8e8' } },
            { scope: 'constant', settings: { foreground: '#ffb74d' } },
            { scope: 'operator', settings: { foreground: '#4fc3f7' } },
            { scope: 'tag', settings: { foreground: '#4fc3f7' } },
            { scope: 'attribute.name', settings: { foreground: '#4dd0e1' } },
            { scope: 'attribute.value', settings: { foreground: '#81c784' } },
          ],
        },
      ],
    },
  },

  activate(ctx) {
    // Register all three themes
    const themes = ctx.manifest.contributes?.themes || []
    for (const theme of themes) {
      ctx.registerTheme(theme)
    }

    // Register a command to cycle through themes
    ctx.registerCommand({
      id: 'theme-pack.cycle',
      label: 'Cycle Theme Pack',
      category: 'Theme Pack',
      callback: () => {
        ctx.showInformationMessage('Theme Pack: Cycle through Aurora, Sunset, Ocean')
      },
    })

    // Register a status bar item
    ctx.registerStatusBar({
      id: 'theme-pack-status',
      text: '🎨 Theme Pack',
      position: 'right',
      command: 'theme-pack.cycle',
    })

    console.log(`[extension] Theme Pack activated — ${themes.length} themes registered`)
  },

  deactivate() {
    console.log('[extension] Theme Pack deactivated')
  },
})
