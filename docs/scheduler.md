# Scheduler

The Scheduler lets you run agent tasks automatically on a recurring schedule.

---

## Creating a Job

1. Go to **Scheduler** in the sidebar
2. Click **New Job**
3. Configure:
   - **Job name** — a label for this job
   - **Task** — the prompt to run
   - **Persona** — which agent persona to use
   - **Schedule** — interval (every N minutes) or daily (at a specific time)
4. Click **Save**

---

## Schedule Types

| Type | Example | Use case |
|---|---|---|
| **Interval** | Every 60 minutes | Polling, monitoring, regular checks |
| **Daily** | 09:00 AM | Morning briefings, daily summaries |

---

## Running a Job Manually

On any saved job, click the **▶ Run** button to execute it immediately regardless of schedule.

---

## Job History

Switch to the **History** tab to see all past executions — job name, trigger type (manual or scheduled), persona, and timestamp.

---

## Enable / Disable

Toggle the switch on any job to pause or resume scheduling without deleting the job.

---

## Current Limitations

> **The Scheduler runs entirely in the browser tab.**

This means:
- Jobs only trigger while Agentis is open in a browser tab
- If you close the tab or the browser, no jobs run until you reopen it
- The "Daily at 09:00" option fires when the tab is open at that time — not at exactly 09:00 every day regardless of browser state

This is a known limitation of browser-based scheduling.

---

## Coming Soon

- **Server-side scheduling** — jobs run on a persistent backend regardless of whether the browser is open
- **Webhook-on-complete** — trigger an external webhook when a scheduled job finishes
- **Output delivery** — automatically send job output to a configured Channel (Slack, Discord, email) after each run
- **Conditional jobs** — only run if a previous job's output contains a specific keyword or condition
- **Job dependencies** — chain jobs so job B only runs after job A completes successfully
