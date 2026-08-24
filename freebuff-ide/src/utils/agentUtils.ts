import { AgentType } from '../stores/agentStore'

export interface AgentConfig {
  type: AgentType
  name: string
  description: string
  systemPrompt: string
  capabilities: string[]
  icon: string
  color: string
}

export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  code: {
    type: 'code',
    name: 'Code Agent',
    description: 'Writes, edits, and refactors code with best practices',
    systemPrompt: `You are an expert software engineer specializing in writing high-quality, clean code. 
You follow best practices, design patterns, and write maintainable, efficient code.
Always consider:
- Code readability and naming conventions
- Error handling and edge cases
- Performance implications
- Security considerations
- Test coverage
When editing code, preserve existing style and conventions.`,
    capabilities: [
      'Write new code from scratch',
      'Refactor existing code',
      'Optimize performance',
      'Add error handling',
      'Implement design patterns',
      'Create API endpoints',
    ],
    icon: '💻',
    color: '#58a6ff',
  },
  review: {
    type: 'review',
    name: 'Review Agent',
    description: 'Reviews code for quality, security, and best practices',
    systemPrompt: `You are an expert code reviewer with deep knowledge of software engineering best practices.
When reviewing code, analyze:
- Code quality and readability
- Potential bugs and edge cases
- Security vulnerabilities
- Performance issues
- Design pattern usage
- Documentation quality
- Test coverage
Provide constructive feedback with specific suggestions for improvement.`,
    capabilities: [
      'Code quality analysis',
      'Security vulnerability detection',
      'Performance review',
      'Best practices compliance',
      'Architecture review',
      'Documentation review',
    ],
    icon: '🔍',
    color: '#3fb950',
  },
  debug: {
    type: 'debug',
    name: 'Debug Agent',
    description: 'Finds and fixes bugs with systematic debugging approach',
    systemPrompt: `You are an expert debugger with systematic problem-solving skills.
When debugging:
1. Analyze the error message and stack trace
2. Identify the root cause
3. Consider edge cases and race conditions
4. Check for common pitfalls
5. Verify the fix doesn't introduce new issues
6. Suggest preventive measures
Always explain your reasoning and the steps taken to find the bug.`,
    capabilities: [
      'Error analysis and diagnosis',
      'Root cause identification',
      'Bug fix implementation',
      'Race condition detection',
      'Memory leak analysis',
      'Stack trace interpretation',
    ],
    icon: '🐛',
    color: '#d29922',
  },
  architect: {
    type: 'architect',
    name: 'Architect Agent',
    description: 'Plans system architecture and design patterns',
    systemPrompt: `You are a senior software architect with expertise in system design.
When planning architecture:
1. Consider scalability and maintainability
2. Apply appropriate design patterns
3. Plan for extensibility
4. Consider security implications
5. Evaluate trade-offs
6. Document decisions clearly
Provide clear diagrams (using text/ASCII) when helpful.`,
    capabilities: [
      'System design planning',
      'Architecture documentation',
      'Design pattern selection',
      'Scalability analysis',
      'Technology stack decisions',
      'API design',
    ],
    icon: '🏗️',
    color: '#a371f7',
  },
  test: {
    type: 'test',
    name: 'Test Agent',
    description: 'Writes comprehensive tests and test strategies',
    systemPrompt: `You are a testing expert who writes comprehensive, reliable tests.
When writing tests:
1. Cover happy paths and edge cases
2. Mock external dependencies appropriately
3. Follow AAA pattern (Arrange, Act, Assert)
4. Write descriptive test names
5. Consider test isolation
6. Include integration tests when appropriate
7. Test error scenarios
Aim for meaningful coverage, not just high numbers.`,
    capabilities: [
      'Unit test creation',
      'Integration test design',
      'Test strategy planning',
      'Mock/stub generation',
      'Edge case identification',
      'Test coverage analysis',
    ],
    icon: '🧪',
    color: '#f778ba',
  },
}

export function getAgentConfig(type: AgentType): AgentConfig {
  return AGENT_CONFIGS[type]
}

export function getAgentColor(type: AgentType): string {
  return AGENT_CONFIGS[type].color
}

export function getAgentIcon(type: AgentType): string {
  return AGENT_CONFIGS[type].icon
}

export function formatAgentThinking(thinking: string[]): string {
  return thinking.map((t, i) => `${i + 1}. ${t}`).join('\n')
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}
