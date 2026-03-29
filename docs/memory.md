# Memory System

Agentis has a built-in persistent memory system backed by **IndexedDB** — the browser's native database. No external service, no PocketBase, no server required.

---

## How It Works

Every time an agent completes a task, a memory entry is automatically saved:
- **Key** — a normalized version of the task description
- **Value** — the first 400 characters of the output
- **Source** — `auto` (agent-saved) or `manual` (you added it)

On future tasks, agents retrieve relevant memories and include them as context in their system prompt.

---

## Storage

| | Old system (localStorage) | New system (IndexedDB) |
|---|---|---|
| Capacity | ~5 MB | Gigabytes |
| Structure | Flat JSON array | Indexed database |
| Survives browser clear | No | Yes |
| Query speed | Linear scan | Indexed lookup |
| Server required | No | No |

---

## Memory Entry Fields

Each memory entry stores:

| Field | Description |
|---|---|
| `agentId` | Which agent persona this belongs to |
| `key` | Short identifier (normalized task text) |
| `value` | Stored content (up to 400 chars) |
| `source` | `auto` or `manual` |
| `category` | `episodic`, `semantic`, `procedural`, or `general` (auto-inferred) |
| `tags` | Optional string array |
| `importance` | 0–1 score, decays over time |
| `accessCount` | How many times this memory was read |
| `lastAccessed` | Timestamp of last read |

---

## Categories (Auto-Inferred)

When a memory is saved, Agentis automatically classifies it:

| Category | Triggered by keywords |
|---|---|
| **Procedural** | code, function, implement, build, deploy, debug, test, api |
| **Semantic** | fact, concept, definition, knowledge, theory, explain |
| **Episodic** | session, task, completed, result, output, previously |
| **General** | everything else |

---

## Importance & Decay

Every memory starts with an importance score:
- Manual memory → **0.8**
- Auto-saved → **0.5**

Each time the memory is accessed (read by an agent): importance increases by `+0.1` (capped at 1.0).

Over time, importance decays exponentially:

```
importance = stored_importance × e^(−decay_rate × days_since_last_access)
```

**Default decay rate:** 5% per day. A memory at 0.5 importance drops to ~0.3 after 10 days of no use.

You can change the decay rate under **Settings → Memory** using the slider.

---

## Managing Memory

### View & Search

Go to **Sessions → Memory** tab or **Settings → Memory**.

- Filter by agent persona
- Search across keys, values, and tags
- See importance score bar and category badge for each entry

### Add Manually

In Sessions → Memory:
1. Select the persona
2. Click **+ Add memory**
3. Enter a key and value

### Export

1. Go to **Settings → Memory**
2. Click **Export**
3. A `.json` file downloads with all entries

### Import

1. Go to **Settings → Memory**
2. Click **Import**
3. Select a previously exported `.json`
4. Duplicate entries are automatically skipped — only new entries are added

This is how you can share or sync memory between machines (export on one, import on another).

### Prune Decayed

Click **Prune Decayed** in Settings → Memory to delete all entries whose importance has fallen below 5%. Keeps your memory store lean and relevant.

---

## Migration from Old System

If you were using an older version of Agentis that stored memories in `localStorage`, they are automatically migrated to IndexedDB on first load. Nothing is lost.

---

## Coming Soon

- **Semantic search** — find memories by meaning, not just keyword matching
- **Memory consolidation** — automatically summarize groups of related memories into one
- **Cross-device sync** — optional sync token to share memory between browsers without a server
- **Memory timelines** — browse what each agent has learned over time with a visual timeline
