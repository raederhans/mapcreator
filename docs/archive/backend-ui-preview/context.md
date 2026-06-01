# Backend UI Preview Context

## 2026-05-31
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-backend-ui-preview`
- Branch: `codex/backend-admin-ui-preview`
- Base: `origin/main` at backend MVP commits.
- Main checkout has unrelated appearance/transport WIP and stays untouched.
- Live server owner: main agent only.
- Implemented route: `/backend/`
- Preview server: `http://127.0.0.1:8032/backend/`
- Runtime data was reset once so the default `admin / correct horse` user becomes the first local admin for review.
- Current UI model is separated by permission and intent:
  - public community is browse-first and visible before login;
  - user center is login-gated and only shows personal saves;
  - admin backend is staff-gated and manages platform state.
- Chinese is the default console language; the `English` button switches the interface and stores the choice in localStorage.
- One expected initial browser 401 can appear from `/auth/me` session probing before login; post-login flows pass.
- Browser screenshot evidence: `.runtime/browser/backend-preview/backend-redesign-zh-fixed.png`.
- Review fix: public saves are no longer readable through owner detail/export routes by other users; public imports use community download allowlist.
- Review fix: admin preview now uses `/api/backend/admin/saves/{id}` so staff can inspect private saves that need moderation.
- Review fix: demo seeding and user/role actions are admin-only UI controls; moderators keep content review access.
- Latest browser screenshot evidence: `.runtime/browser/backend-preview/backend-redesign-admin-fixed.png`.
