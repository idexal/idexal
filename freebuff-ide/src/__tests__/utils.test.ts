import { describe, it, expect } from 'vitest'
import { detectLanguage, getLanguageIcon, getFileExtension } from '../utils/languageDetector'
import { getAgentConfig, getAgentColor, getAgentIcon, truncateText } from '../utils/agentUtils'

describe('Language Detector', () => {
  it('should detect TypeScript files', () => {
    expect(detectLanguage('app.ts')).toBe('typescript')
    expect(detectLanguage('component.tsx')).toBe('typescript')
  })

  it('should detect JavaScript files', () => {
    expect(detectLanguage('script.js')).toBe('javascript')
    expect(detectLanguage('component.jsx')).toBe('javascript')
  })

  it('should detect Rust files', () => {
    expect(detectLanguage('main.rs')).toBe('rust')
  })

  it('should detect Python files', () => {
    expect(detectLanguage('app.py')).toBe('python')
  })

  it('should detect Go files', () => {
    expect(detectLanguage('server.go')).toBe('go')
  })

  it('should return plaintext for unknown files', () => {
    expect(detectLanguage('unknown.xyz')).toBe('plaintext')
  })

  it('should get language icons', () => {
    expect(getLanguageIcon('typescript')).toBe('📘')
    expect(getLanguageIcon('rust')).toBe('🦀')
    expect(getLanguageIcon('python')).toBe('🐍')
  })

  it('should get file extensions', () => {
    expect(getFileExtension('app.ts')).toBe('.ts')
    expect(getFileExtension('noext')).toBe('')
    expect(getFileExtension('file.name.ts')).toBe('.ts')
  })
})

describe('Agent Utils', () => {
  it('should get agent config', () => {
    const config = getAgentConfig('code')
    expect(config.name).toBe('Code Agent')
    expect(config.type).toBe('code')
    expect(config.capabilities.length).toBeGreaterThan(0)
  })

  it('should get agent colors', () => {
    expect(getAgentColor('code')).toBe('#58a6ff')
    expect(getAgentColor('review')).toBe('#3fb950')
    expect(getAgentColor('debug')).toBe('#d29922')
  })

  it('should get agent icons', () => {
    expect(getAgentIcon('code')).toBe('💻')
    expect(getAgentIcon('review')).toBe('🔍')
    expect(getAgentIcon('debug')).toBe('🐛')
  })

  it('should truncate text', () => {
    expect(truncateText('short', 10)).toBe('short')
    expect(truncateText('this is a very long text', 10)).toBe('this is...')
    expect(truncateText('exact', 5)).toBe('exact')
  })
})
