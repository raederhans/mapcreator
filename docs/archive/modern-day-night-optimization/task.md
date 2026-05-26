# Modern day-night optimization task

## Goal

Improve Appearance > Day/Night > modern city lights so manual time changes and later animation are responsive, while keeping the modern look readable in dense regions such as Europe.

## User-visible acceptance

- Modern city lights keep the current overall visual direction.
- Manual time slider no longer rebuilds every modern light primitive on every time change.
- Population boost remains positive but is less dominant in dense European regions.
- Default shadow opacity is darker and the HTML initial values match runtime defaults.
- Existing historical 1930s behavior remains stable.

## Live process owner

- Main agent owns all live tests, browser smoke, dev server, and long-running commands.
- Subagents are limited to static analysis and review of files or completed log snapshots.
