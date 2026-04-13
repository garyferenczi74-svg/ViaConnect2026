# Jeffery ↔ Michelangelo Integration Protocol

## Task Delegation Flow
1. Jeffery receives task from user or parent system
2. Jeffery routes coding tasks to Michelangelo
3. Michelangelo runs full 4-pillar pipeline
4. Michelangelo reports results back to Jeffery
5. Jeffery delivers completed output to user

## Communication Protocol
- Channel: Cross-agent message bus via AgentMessage type
- Heartbeat: Michelangelo pings Jeffery every 30 minutes
- Escalation: After 2 failed TDD retries, Michelangelo escalates to Jeffery
- Approval: Jeffery can override Michelangelo's review blocks (emergency only)

## Parallel Operation
- Michelangelo processes multiple micro-tasks concurrently (Obra parallel execution)
- Jeffery can queue multiple features — Michelangelo pipelines them independently
- All sibling agents receive broadcast status updates from Michelangelo

## Standing Rules Enforcement
Michelangelo's reviewer checks ALL ViaConnect standing rules on every single
piece of code, regardless of which agent originally authored it:
- Lucide React icons only (strokeWidth={1.5})
- No emojis
- Desktop + Mobile responsive from the start
- getDisplayName for all client names
- Bioavailability: 10-27x
- Semaglutide excluded
- Retatrutide: injectable only, never stacked
- Bio Optimization (not Vitality Score)
- Design tokens: Deep Navy #1A2744, Teal #2DA5A0, Orange #B75E18
- Font: Instrument Sans
- Never touch Supabase email templates, package.json, or applied migrations
