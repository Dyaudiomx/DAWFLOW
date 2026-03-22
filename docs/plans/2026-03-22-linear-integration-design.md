# Linear Integration Design — DAWFLOW

**Date**: 2026-03-22
**Status**: Approved & Implemented

## Decision

Linear is the single source of truth for all DAWFLOW task tracking. All Claude Code agents (David's and collaborators') follow the same workflow defined in `CLAUDE.md`.

## Architecture

```
Linear (DAWFLOW team)
  ├── Projects (Engine, React UI, AI Features, etc.)
  │   └── Milestones (Alpha, Beta, v1.0)
  │       └── Issues (individual tasks)
  │
  ├── Status Flow: Backlog → Todo → In Progress → In Review → Done
  ├── Labels: Bug, Feature, Improvement, AI, Infrastructure, API
  └── Priority: 1=Urgent, 2=High, 3=Normal, 4=Low

Claude Code Agent (Session)
  ├── Connects via Linear MCP server (https://mcp.linear.app/mcp)
  ├── Self-assigns issues, moves to In Progress
  ├── Comments progress, creates new issues for discoveries
  └── Moves to Done when verified
```

## Workflow: Approach A — Linear as Full Source of Truth

### Why This Approach
- Full traceability of all agent work
- Both humans see what every agent session did
- No duplicate work (agents check assignees before claiming)
- Minimal overhead (a few API calls per session)

### Session Flow
1. Check for assigned in-progress issues (resume if found)
2. If nothing assigned, pick highest-priority unassigned Todo
3. Self-assign, move to In Progress, comment
4. Work with progress comments at milestones
5. Create new issues for discovered bugs/features
6. Move to Done when complete, comment summary

### Conflict Prevention
- Check assignee before claiming
- Skip issues assigned to others
- Link overlapping issues via comments

## Labels
| Label | Use For |
|-------|---------|
| Bug | Broken functionality |
| Feature | New capabilities |
| Improvement | Enhancements to existing features |
| AI | AI-powered features |
| Infrastructure | Build system, CI/CD, tooling |
| API | IPC commands, WebSocket, engine API |

## Integration
- MCP server: `claude mcp add --transport http linear https://mcp.linear.app/mcp`
- Auth: `/mcp` in Claude Code session
- Instructions: Added to `CLAUDE.md` under "Linear Integration — Task Tracking Workflow"
