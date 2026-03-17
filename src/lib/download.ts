import type { Artifact } from '@/types/artifacts'

export async function downloadArtifactBundle(artifacts: Artifact[], _projectName: string): Promise<void> {
  const fileMap = new Map<string, Artifact>()
  for (const artifact of artifacts) {
    fileMap.set(artifact.filename, artifact)
  }

  const files = Array.from(fileMap.values())
  if (files.length === 0) return

  if (files.length === 1) {
    downloadSingleFile(files[0])
    return
  }

  for (let i = 0; i < files.length; i++) {
    await new Promise<void>(resolve => setTimeout(resolve, i * 150))
    downloadSingleFile(files[i])
  }
}

function downloadSingleFile(artifact: Artifact): void {
  const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = artifact.filename.split('/').pop() ?? artifact.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function copyToClipboard(content: string): Promise<void> {
  return navigator.clipboard.writeText(content)
}
