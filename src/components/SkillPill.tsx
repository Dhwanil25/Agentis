import { SKILLS } from '@/data/skills'

interface Props {
  skillId: string
  size?: 'sm' | 'md'
}

export function SkillPill({ skillId, size = 'md' }: Props) {
  const skill = SKILLS[skillId]
  if (!skill) return null
  const { bg, border, text } = skill.color
  const padding = size === 'sm' ? '2px 8px' : '4px 12px'
  const fontSize = size === 'sm' ? '11px' : '12px'

  return (
    <span
      style={{
        display: 'inline-block',
        padding,
        borderRadius: '20px',
        border: `0.5px solid ${border}`,
        background: bg,
        color: text,
        fontSize,
        fontWeight: 500,
        margin: '2px',
      }}
    >
      {skill.label}
    </span>
  )
}
