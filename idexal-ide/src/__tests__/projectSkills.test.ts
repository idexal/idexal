import { describe, it, expect } from 'vitest'
import { parseSkillFrontmatter } from '../services/projectSkillsService'

describe('parseSkillFrontmatter', () => {
  it('parses name, description and metadata from standard SKILL.md', () => {
    const md = `---
name: azure-deploy
description: "Execute Azure deployments with error recovery."
license: MIT
metadata:
  author: Microsoft
  version: "1.2.1"
---

# Azure Deploy

Body text here.
`
    const meta = parseSkillFrontmatter(md)
    expect(meta.name).toBe('azure-deploy')
    expect(meta.description).toBe('Execute Azure deployments with error recovery.')
    expect(meta.license).toBe('MIT')
    expect(meta.author).toBe('Microsoft')
    expect(meta.version).toBe('1.2.1')
  })

  it('returns empty object when there is no front matter', () => {
    expect(parseSkillFrontmatter('# Just markdown')).toEqual({})
  })

  it('handles single-quoted values', () => {
    const meta = parseSkillFrontmatter("---\nname: 'my-skill'\ndescription: 'Does things'\n---\nbody")
    expect(meta.name).toBe('my-skill')
    expect(meta.description).toBe('Does things')
  })

  it('tolerates CRLF line endings', () => {
    const meta = parseSkillFrontmatter('---\r\nname: crlf-skill\r\ndescription: Handles CRLF\r\n---\r\nbody')
    expect(meta.name).toBe('crlf-skill')
    expect(meta.description).toBe('Handles CRLF')
  })
})
