import { useState, useEffect, useRef } from 'react'
import { marked } from 'marked'

// Import all docs as raw strings via Vite's ?raw loader
import gettingStartedMd from '../../../docs/getting-started.md?raw'
import architectureMd   from '../../../docs/architecture.md?raw'
import universeMd       from '../../../docs/universe.md?raw'
import workflowsMd      from '../../../docs/workflows.md?raw'
import memoryMd         from '../../../docs/memory.md?raw'
import skillsMd         from '../../../docs/skills.md?raw'
import channelsMd       from '../../../docs/channels.md?raw'
import providersMd      from '../../../docs/providers.md?raw'
import schedulerMd      from '../../../docs/scheduler.md?raw'

const DOCS: { id: string; title: string; content: string; section: string }[] = [
  { id: 'getting-started', title: 'Getting Started',  content: gettingStartedMd, section: 'OVERVIEW'    },
  { id: 'architecture',    title: 'Architecture',     content: architectureMd,   section: 'OVERVIEW'    },
  { id: 'universe',        title: 'Universe',         content: universeMd,       section: 'CORE'        },
  { id: 'workflows',       title: 'Workflows',        content: workflowsMd,      section: 'CORE'        },
  { id: 'memory',          title: 'Memory',           content: memoryMd,         section: 'CORE'        },
  { id: 'skills',          title: 'Skills',           content: skillsMd,         section: 'EXTENSIONS'  },
  { id: 'channels',        title: 'Channels',         content: channelsMd,       section: 'EXTENSIONS'  },
  { id: 'providers',       title: 'Providers',        content: providersMd,      section: 'REFERENCE'   },
  { id: 'scheduler',       title: 'Scheduler',        content: schedulerMd,      section: 'REFERENCE'   },
]

const SECTIONS = ['OVERVIEW', 'CORE', 'EXTENSIONS', 'REFERENCE']

// Configure marked: safe output, open links in new tab
marked.use({
  gfm: true,
  breaks: false,
})

const renderer = new marked.Renderer()
renderer.link = ({ href, title, text }: { href: string; title?: string | null; text: string }) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`
marked.use({ renderer })

export function DocsPage() {
  const [activeId, setActiveId] = useState('getting-started')
  const contentRef = useRef<HTMLDivElement>(null)

  const doc = DOCS.find(d => d.id === activeId) ?? DOCS[0]
  const html = marked.parse(doc.content) as string

  // Scroll to top when switching docs
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [activeId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Docs</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Agentis documentation</span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 188, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
          padding: '12px 0',
        }}>
          {SECTIONS.map(section => {
            const items = DOCS.filter(d => d.section === section)
            return (
              <div key={section} style={{ marginBottom: 6 }}>
                <div style={{
                  fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'rgba(107,114,128,0.7)',
                  padding: '6px 14px 4px',
                }}>
                  {section}
                </div>
                {items.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setActiveId(d.id)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '6px 14px', border: 'none', cursor: 'pointer',
                      fontSize: 12.5,
                      background: activeId === d.id ? 'rgba(99,102,241,0.12)' : 'none',
                      color: activeId === d.id ? '#818cf8' : 'var(--fg)',
                      borderLeft: activeId === d.id ? '2px solid var(--accent)' : '2px solid transparent',
                      fontWeight: activeId === d.id ? 600 : 400,
                      transition: 'background 0.1s',
                    }}
                  >
                    {d.title}
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          style={{ flex: 1, overflowY: 'auto', padding: '24px 36px 48px', maxWidth: 800 }}
          dangerouslySetInnerHTML={{ __html: html }}
          className="docs-content"
        />
      </div>

      <style>{`
        .docs-content h1 { font-size: 22px; font-weight: 700; color: var(--fg); margin: 0 0 6px; line-height: 1.3; }
        .docs-content h2 { font-size: 16px; font-weight: 700; color: var(--fg); margin: 28px 0 10px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
        .docs-content h3 { font-size: 13.5px; font-weight: 600; color: var(--fg); margin: 20px 0 8px; }
        .docs-content h4 { font-size: 12px; font-weight: 600; color: var(--muted); margin: 16px 0 6px; text-transform: uppercase; letter-spacing: 0.06em; }
        .docs-content p  { font-size: 13px; line-height: 1.75; color: var(--fg); margin: 0 0 12px; opacity: 0.9; }
        .docs-content ul, .docs-content ol { margin: 0 0 12px; padding-left: 22px; }
        .docs-content li { font-size: 13px; line-height: 1.7; color: var(--fg); margin-bottom: 4px; opacity: 0.9; }
        .docs-content code { font-family: var(--font-mono); font-size: 11.5px; background: rgba(255,255,255,0.06); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; color: #a5b4fc; }
        .docs-content pre { background: rgba(0,0,0,0.35); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; overflow-x: auto; margin: 0 0 14px; }
        .docs-content pre code { background: none; border: none; padding: 0; color: #e2e8f0; font-size: 12px; }
        .docs-content blockquote { margin: 0 0 14px; padding: 10px 16px; border-left: 3px solid var(--accent); background: rgba(99,102,241,0.06); border-radius: 0 6px 6px 0; font-size: 13px; color: var(--muted); font-style: italic; }
        .docs-content table { width: 100%; border-collapse: collapse; margin: 0 0 16px; font-size: 12px; }
        .docs-content th { text-align: left; padding: 7px 12px; border-bottom: 1px solid var(--border); color: var(--muted); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; }
        .docs-content td { padding: 7px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--fg); }
        .docs-content tr:last-child td { border-bottom: none; }
        .docs-content a { color: var(--accent); text-decoration: none; }
        .docs-content a:hover { text-decoration: underline; }
        .docs-content strong { font-weight: 600; color: var(--fg); }
        .docs-content hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
      `}</style>
    </div>
  )
}
