# Workflows

Workflows are pre-built multi-step agent pipelines. Instead of a freeform task, you pick a template and the system automatically runs the right sequence of agents in the right order.

---

## Using Workflows

1. Go to **Workflows** in the sidebar
2. Browse the template library
3. Select a template
4. Enter your task/topic
5. Click **Run**

Each node in the workflow runs sequentially or in parallel based on dependencies. You can watch each step complete in real time with a live progress display.

---

## Workflow Templates

Templates are defined in `src/data/templates.ts`. Each one specifies:

- **Nodes** — individual agent steps (e.g., Research, Draft, Review, Finalize)
- **Dependencies** — which nodes must complete before others start
- **Parallel groups** — nodes that can run simultaneously
- **Agent role** — which specialized agent handles each node
- **Max tokens / temperature** — per-node model settings

---

## Template Structure (for developers)

```typescript
interface WorkflowTemplate {
  id: string
  name: string
  description: string
  estimatedMinutes: number
  nodeDefinitions: NodeDefinition[]
}

interface NodeDefinition {
  id: string
  skill: string           // display label
  title: string           // shown in the UI
  thinking: string        // the step's sub-task prompt
  dependsOn: string[]     // node IDs that must complete first
  parallelGroup?: string  // nodes with same group run simultaneously
  critiques?: string[]    // node IDs that review this node's output
  maxTokens?: number
  temperature?: number
}
```

---

## Adding a Custom Template

1. Open `src/data/templates.ts`
2. Add an entry to the `WORKFLOW_TEMPLATES` array
3. Define your nodes and dependencies

Example — a simple 3-node research pipeline:

```typescript
{
  id: 'quick-research',
  name: 'Quick Research',
  description: 'Research a topic and produce a summary',
  estimatedMinutes: 3,
  nodeDefinitions: [
    {
      id: 'research',
      skill: 'Research',
      title: 'Gather Information',
      thinking: 'Research the topic thoroughly. Find key facts, figures, and sources.',
      dependsOn: [],
    },
    {
      id: 'analyze',
      skill: 'Analysis',
      title: 'Analyze Findings',
      thinking: 'Analyze the research. Identify the most important insights.',
      dependsOn: ['research'],
    },
    {
      id: 'write',
      skill: 'Writing',
      title: 'Write Summary',
      thinking: 'Write a clear, structured summary based on the analysis.',
      dependsOn: ['analyze'],
    },
  ],
}
```

---

## Output Tabs

After a workflow completes, each node's output is available in a separate tab. You can review the intermediate steps — not just the final output.

---

## Coming Soon

- **Visual workflow builder** — drag-and-drop interface to create custom pipelines without editing code
- **Workflow export/import** — share workflow templates as JSON files
- **Conditional branching** — nodes that choose different paths based on previous output
- **Webhook triggers** — start a workflow automatically from an external event
- **Workflow history** — saved runs with full node-by-node output replay
