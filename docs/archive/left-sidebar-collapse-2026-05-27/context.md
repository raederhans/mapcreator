# Left Sidebar Collapse Context

- Existing right sidebar collapse is implemented in `index.html`, `css/style.css`, and `js/ui/sidebar.js`.
- Left sidebar originally used the outer `<aside>` as the scroll container, so collapse needs an inner content wrapper before the outer shell can animate to width `0`.
- Collapse handle follows the right sidebar desktop breakpoint and stays hidden below `1280px`, where drawer controls already own narrow layouts.
- Live process owner: main agent. Verification used targeted static tests and syntax checks; local server returned HTTP `200`.
- Browser automation note: repo-local Playwright packages are not installed, and the bundled runtime has `playwright` without `playwright-core`, so the visual smoke was not available through local Node.
