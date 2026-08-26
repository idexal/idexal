export interface Snippet {
  id: string
  name: string
  description: string
  language: string
  prefix: string
  body: string
  tags: string[]
}

const SNIPPETS: Snippet[] = [
  // React
  {
    id: 'react-component',
    name: 'React Functional Component',
    description: 'Creates a new React functional component',
    language: 'typescript',
    prefix: 'rfc',
    body: `import React from 'react'

interface {{Name}}Props {
  children?: React.ReactNode
}

export default function {{Name}}({ children }: {{Name}}Props) {
  return (
    <div>
      {{Name}}
      {children}
    </div>
  )
}`,
    tags: ['react', 'component'],
  },
  {
    id: 'react-hook',
    name: 'React Custom Hook',
    description: 'Creates a new custom React hook',
    language: 'typescript',
    prefix: 'rh',
    body: `import { useState, useEffect } from 'react'

export function use{{Name}}() {
  const [state, setState] = useState(null)

  useEffect(() => {
    // Effect logic
  }, [])

  return { state, setState }
}`,
    tags: ['react', 'hook'],
  },
  {
    id: 'react-state',
    name: 'useState Hook',
    description: 'Adds useState hook',
    language: 'typescript',
    prefix: 'us',
    body: `const [{{state}}, set{{State}}] = useState<{{Type}}>({{initialValue}})`,
    tags: ['react', 'state'],
  },
  {
    id: 'react-effect',
    name: 'useEffect Hook',
    description: 'Adds useEffect hook',
    language: 'typescript',
    prefix: 'ue',
    body: `useEffect(() => {
  {{effect}}
  
  return () => {
    {{cleanup}}
  }
}, [{{deps}}])`,
    tags: ['react', 'effect'],
  },

  // TypeScript
  {
    id: 'ts-interface',
    name: 'TypeScript Interface',
    description: 'Creates a new TypeScript interface',
    language: 'typescript',
    prefix: 'ti',
    body: `interface {{Name}} {
  {{property}}: {{type}}
}`,
    tags: ['typescript', 'interface'],
  },
  {
    id: 'ts-type',
    name: 'TypeScript Type',
    description: 'Creates a new TypeScript type',
    language: 'typescript',
    prefix: 'tt',
    body: `type {{Name}} = {
  {{property}}: {{type}}
}`,
    tags: ['typescript', 'type'],
  },
  {
    id: 'ts-enum',
    name: 'TypeScript Enum',
    description: 'Creates a new TypeScript enum',
    language: 'typescript',
    prefix: 'tenum',
    body: `enum {{Name}} {
  {{Value1}} = '{{value1}}',
  {{Value2}} = '{{value2}}',
}`,
    tags: ['typescript', 'enum'],
  },

  // Rust
  {
    id: 'rust-struct',
    name: 'Rust Struct',
    description: 'Creates a new Rust struct',
    language: 'rust',
    prefix: 'rs',
    body: `#[derive(Debug, Clone)]
pub struct {{Name}} {
    pub {{field}}: {{type}},
}

impl {{Name}} {
    pub fn new({{field}}: {{type}}) -> Self {
        Self { {{field}} }
    }
}`,
    tags: ['rust', 'struct'],
  },
  {
    id: 'rust-impl',
    name: 'Rust Implementation',
    description: 'Creates a new Rust impl block',
    language: 'rust',
    prefix: 'ri',
    body: `impl {{Type}} {
    pub fn {{method}}(&self) -> {{ReturnType}} {
        {{body}}
    }
}`,
    tags: ['rust', 'impl'],
  },
  {
    id: 'rust-test',
    name: 'Rust Test',
    description: 'Creates a new Rust test',
    language: 'rust',
    prefix: 'rt',
    body: `#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_{{name}}() {
        {{body}}
    }
}`,
    tags: ['rust', 'test'],
  },

  // API
  {
    id: 'api-endpoint',
    name: 'REST API Endpoint',
    description: 'Creates a new REST API endpoint',
    language: 'typescript',
    prefix: 'api',
    body: `export async function {{method}}(req: Request, res: Response) {
  try {
    {{body}}
    res.status(200).json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}`,
    tags: ['api', 'rest'],
  },

  // Tests
  {
    id: 'test-describe',
    name: 'Test Suite',
    description: 'Creates a new test suite',
    language: 'typescript',
    prefix: 'td',
    body: `describe('{{Name}}', () => {
  it('should {{test}}', () => {
    {{body}}
  })
})`,
    tags: ['test', 'describe'],
  },
  {
    id: 'test-it',
    name: 'Test Case',
    description: 'Creates a new test case',
    language: 'typescript',
    prefix: 'ti',
    body: `it('should {{test}}', () => {
  // Arrange
  {{arrange}}

  // Act
  {{act}}

  // Assert
  {{assert}}
})`,
    tags: ['test', 'it'],
  },
]

class SnippetService {
  private snippets: Snippet[] = SNIPPETS

  getAll(): Snippet[] {
    return this.snippets
  }

  getByLanguage(language: string): Snippet[] {
    return this.snippets.filter(s => s.language === language)
  }

  getByPrefix(prefix: string): Snippet[] {
    return this.snippets.filter(s => s.prefix.startsWith(prefix))
  }

  search(query: string): Snippet[] {
    const q = query.toLowerCase()
    return this.snippets.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some(t => t.includes(q))
    )
  }

  getById(id: string): Snippet | undefined {
    return this.snippets.find(s => s.id === id)
  }

  expand(snippet: Snippet, params: Record<string, string> = {}): string {
    let body = snippet.body
    for (const [key, value] of Object.entries(params)) {
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    return body
  }
}

export const snippetService = new SnippetService()
export default snippetService
