# Landing UI Polish Context

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-landing-ui-polish`.
- Branch: `codex/landing-ui-polish`.
- Live process owner: main agent owns all dev server, browser smoke, and pages-dist verification.
- Design constraints: static landing page, no React/Tailwind/shadcn install, use shadcn-style composition ideas only.
- Web guideline reminders: native buttons/links, visible focus, explicit image dimensions, heading wrapping, reduced motion, no transition-all, scroll-margin on sections, initial HTML content.
- Verified data: 391 catalog entries, 5 scenarios, 21,338 world cities, 189,269 city aliases, 48,351 geo aliases, Japan road preview 4,794, Japan rail preview 1,105, global airports 893, global ports 1,081.
- Implemented topbar language switch, real stats strip, source family strip, feature proof points, scenario template gallery, and What's New section.
- Verification completed: `node --check landing\app.js`, i18n/ARIA key check, anti-pattern scan, `npm run verify:pages-dist`, and Playwright desktop/mobile smoke against `http://127.0.0.1:8001/`.
- Screenshots: `.runtime/browser/landing-ui-polish/desktop.png` and `.runtime/browser/landing-ui-polish/mobile.png`.
