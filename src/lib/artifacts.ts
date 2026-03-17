import type { Artifact, ArtifactType } from '@/types/artifacts'

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function inferArtifactType(filename: string | undefined, lang: string | undefined): ArtifactType {
  if (!filename) {
    if (lang === 'yaml' || lang === 'yml') return 'openapi-spec'
    if (lang === 'markdown' || lang === 'md') return 'markdown-doc'
    if (lang === 'dockerfile') return 'dockerfile'
    return 'code-file'
  }
  const lower = filename.toLowerCase()
  if (lower === 'dockerfile' || lower.endsWith('.dockerfile')) return 'dockerfile'
  if (lower.endsWith('.md') || lower.endsWith('.mdx')) return 'markdown-doc'
  if (lower === 'openapi.yaml' || lower === 'openapi.json' || lower.endsWith('.openapi.yaml')) return 'openapi-spec'
  if (lower.includes('.test.') || lower.includes('.spec.') || lower.includes('__tests__')) return 'test-suite'
  if (
    lower === 'docker-compose.yml' ||
    lower === '.env.example' ||
    (lower.endsWith('.json') && (lower.includes('tsconfig') || lower === 'package.json'))
  ) return 'config-file'
  return 'code-file'
}

export function extractArtifacts(nodeId: string, rawOutput: string): Artifact[] {
  const artifacts: Artifact[] = []

  // Match file-tree JSON
  const fileTreeMatch = rawOutput.match(/```json\s+[\w./\-]+\.json\s*\n([\s\S]*?)```/)
  if (fileTreeMatch) {
    try {
      const parsed = JSON.parse(fileTreeMatch[1])
      if (parsed.type === 'file-tree') {
        artifacts.push({
          id: nanoid(),
          type: 'file-tree',
          filename: 'scaffold.json',
          language: 'json',
          content: fileTreeMatch[1].trim(),
          nodeId,
        })
      }
    } catch { /* ignore malformed JSON */ }
  }

  // Match OpenAPI YAML
  const openapiMatch = rawOutput.match(/```ya?ml\s+[\w./\-]*openapi[\w./\-]*\s*\n([\s\S]*?)```/i)
  if (openapiMatch) {
    artifacts.push({
      id: nanoid(),
      type: 'openapi-spec',
      filename: 'openapi.yaml',
      language: 'yaml',
      content: openapiMatch[1].trim(),
      nodeId,
    })
  }

  // Match labeled code blocks: ```lang path/to/file.ext
  const labeledBlockRegex = /```(\w+)\s+([\w./\-@]+\.[\w]+)\s*\n([\s\S]*?)```/g
  let match
  while ((match = labeledBlockRegex.exec(rawOutput)) !== null) {
    const [, lang, filename, content] = match
    if (!content.trim()) continue
    // Skip if already captured as file-tree or openapi
    if (filename.endsWith('.json') && content.includes('"type":"file-tree"')) continue
    if (filename.toLowerCase().includes('openapi')) continue

    artifacts.push({
      id: nanoid(),
      type: inferArtifactType(filename, lang),
      filename,
      language: lang,
      content: content.trim(),
      nodeId,
    })
  }

  // Match Dockerfile (no extension pattern)
  const dockerfileMatch = rawOutput.match(/```dockerfile\s+(Dockerfile[\w./\-]*)\s*\n([\s\S]*?)```/i)
  if (dockerfileMatch) {
    artifacts.push({
      id: nanoid(),
      type: 'dockerfile',
      filename: dockerfileMatch[1],
      language: 'dockerfile',
      content: dockerfileMatch[2].trim(),
      nodeId,
    })
  }

  return artifacts
}
