export type ArtifactType =
  | 'code-file'
  | 'file-tree'
  | 'openapi-spec'
  | 'markdown-doc'
  | 'config-file'
  | 'test-suite'
  | 'dockerfile'
  | 'diagram'

export interface Artifact {
  id: string
  type: ArtifactType
  filename: string
  language?: string
  content: string
  nodeId: string
}
