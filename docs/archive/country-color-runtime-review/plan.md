# Country Color Runtime Review

## Plan
- [x] Trace KOR/ONG/GNG color values across source constants, countries, startup bundles, palette audit, and git history.
- [x] Restore confirmed manually managed KOR color and lock it with tests.
- [x] Rebuild checked-in countries and startup bundles.
- [x] Verify targeted tests and source/dist delivery checks.
- [x] Record whether a persistent dev color tool should be added separately.

## Context
- User observed Onega appears corrected after refresh, while Korean Residency-General still looks unchanged.
- Git history shows KOR changed from `#82132e` to `#009163` around the earlier color reset wave.
- Current `color_policy: locked` only preserved the already-reset KOR value because the manual override constant also contains `#009163`.
- Existing Dev Workspace has color controls for creating new tags and inspector has runtime color picker; persistent editing for existing tag colors is the missing tool surface.

## Task
Restore KOR's historical manual color without pulling palette-managed tags like GNG away from palette audit.
