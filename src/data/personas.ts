import type { Persona } from '@/types'

export const PERSONAS: Persona[] = [
  {
    id: 'dev',
    label: 'Developer',
    icon: '{ }',
    description: 'Code, tests, APIs, reviews',
    skills: ['planner', 'coder', 'reviewer'],
    suggestions: [
      'Write a rate-limiter middleware for Express using a sliding window algorithm',
      'Generate Jest unit tests for a function that parses and validates user input',
      'Build a debounce utility in TypeScript with full type safety',
      'Create a code review checklist for a REST API pull request',
    ],
  },
  {
    id: 'writer',
    label: 'Writer',
    icon: 'Aa',
    description: 'Blogs, emails, copy, posts',
    skills: ['planner', 'writer', 'editor'],
    suggestions: [
      'Write an SEO-optimised blog post outline on how AI is changing remote work',
      'Draft a 3-email cold outreach sequence for a B2B SaaS product',
      'Write 3 product description variations for a premium wireless headphone',
      'Write a compelling LinkedIn thought leadership post on product-market fit',
    ],
  },
  {
    id: 'analyst',
    label: 'Analyst',
    icon: '∿',
    description: 'Data, metrics, strategy',
    skills: ['planner', 'analyst', 'researcher'],
    suggestions: [
      'Build a SWOT analysis framework for a DTC health supplement brand',
      'Define KPIs and metrics for a B2B SaaS analytics dashboard',
      'Create a competitor analysis template for a fintech startup',
      'Design a data cleaning plan for a messy CSV of customer transactions',
    ],
  },
  {
    id: 'marketer',
    label: 'Marketer',
    icon: '★',
    description: 'GTM, campaigns, content',
    skills: ['planner', 'writer', 'analyst'],
    suggestions: [
      'Write a go-to-market strategy for an AI project management SaaS',
      'Create 5 Facebook ad copy variations for a productivity app',
      'Plan a 30-day social media content calendar for a personal finance brand',
      'Write 3 brand positioning statement variations for a sustainable fashion brand',
    ],
  },
  {
    id: 'student',
    label: 'Student',
    icon: '?',
    description: 'Essays, study plans, concepts',
    skills: ['planner', 'researcher', 'writer'],
    suggestions: [
      'Explain gradient descent in machine learning using a simple analogy',
      'Create a 4-week study plan for a machine learning university exam',
      'Build a detailed outline for a 2000-word essay on universal basic income',
      'Show me a method for summarising a research paper in under 300 words',
    ],
  },
  {
    id: 'founder',
    label: 'Founder',
    icon: '$',
    description: 'Pitch, investors, unit economics',
    skills: ['planner', 'analyst', 'writer'],
    suggestions: [
      'Write the narrative arc for a 10-slide seed-stage pitch deck',
      'Generate the 10 toughest investor questions with sharp answers',
      'Model unit economics for a SaaS at $299/mo with 5% monthly churn',
      'Write a cold email to a potential Salesforce VP advisor',
    ],
  },
]
