---
name: michelangelo-hooks
description: Integration rules for how Jeffery and other agents invoke Michelangelo
---

# Michelangelo Integration Rules

## Jeffery -> Michelangelo (Mandatory Invocations)

Jeffery MUST invoke Michelangelo as a parallel sub-agent before delegating any
implementation task to any specialist agent. The flow is:

```
User Request
    |
Jeffery (Orchestrator), task analysis
    |
Michelangelo (OBRA Gate O+B), brainstorm + micro-task plan
    |
Jeffery, dispatches micro-tasks to specialist agents
    |  [parallel]
Specialist Agents, implement individual micro-tasks
    |
Michelangelo (OBRA Gate R+A), review + test audit per micro-task
    |
Jeffery, assembles results, reports to Gary
```

## Specialist Agent Rules

Any agent (database, UI, API, auth, etc.) MUST:
1. Receive its task as a Michelangelo-approved micro-task (from the Micro-Task Plan)
2. Write tests FIRST before implementation
3. Submit diff to Michelangelo for Gate R review before marking task complete
4. Not proceed if Michelangelo issues a BLOCKED status

## Parallel Operation

Michelangelo runs CONCURRENTLY with implementation agents:
- Gate O+B runs before any code is written (sequential blocker)
- Gate R+A runs in parallel with other micro-tasks being implemented
- Michelangelo may review Task #3 while agents implement Task #4

## 24/7 Availability

Michelangelo has no off state. Every Claude Code session that involves code
changes automatically activates Michelangelo. Gary does not need to invoke him
explicitly, Jeffery handles all routing.
