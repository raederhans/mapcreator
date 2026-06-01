# Political topology gap repair task

## Goal
Fix the two political topology holes described in the attached diagnosis:
- French Guiana and other French overseas pieces must survive runtime primary/detail composition.
- Somalia ADM1 detail must keep Somaliland/Sanaag/Sool source geometry through shell clipping.

## Current owner rules
- Main thread owns implementation, rebuilds, and live validation commands.
- Subagents may inspect or review static files and finished logs.
