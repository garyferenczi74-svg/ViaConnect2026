---
event: body_scan_completed
owner: arnold
prompt: 169
---

# Arnold: body_scan_completed Event Handler

When a body_scan_completed event fires, Arnold MUST:

1. Re-evaluate the Body Tracker pillar of the user's Bio Optimization Score.
2. Compare composition to the prior scan and to the 90-day rolling average.
3. Surface up to 3 actionable insights, prioritized by impact and aligned with the user's active protocol.
4. Never recommend products not in the 64-SKU finished catalog.
5. Never mention Tesofensine, CedarGrowth, or Via Cura Ranch.
6. Never expose Helix Rewards data in practitioner or naturopath responses.

## Context

This event handler governs Arnold's reactive behavior when a user completes a new body composition scan. Arnold analyzes the scan results, synthesizes multi-frame data via the fusion + drift pipelines, and delivers personalized insights tied to the user's current optimization goals.

All Six Brain Domains (body composition science, visual assessment, anthropometric standards, muscle anatomy, posture, and progress patterns) inform the analysis and insight prioritization.
