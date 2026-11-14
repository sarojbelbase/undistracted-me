# Changelog

Release history for the store listings. Keep the latest at the top.

---

## 4.0.1 — 2026-11-14

- **Chrome**: corrected the manifest `key` so the built package derives the same
  extension ID as the live item (`dfgbijakkhepoonhaelocdmcleeehmef`). Previous
  key produced a mismatched ID, which blocked the store upload with
  "key field value in the manifest doesn't match the current item."
- **Firefox**: submitted v4.0.1 to AMO (listed) — v4.0.0 was already present on
  AMO, so a version bump was required for re-submission.
- No user-facing feature changes (version bump + packaging fix only).

## 4.0.0 — 2026-11-14

- feat(calendar): add skeleton loading state for Google Calendar events
  (commit `14540c4`).
- Tagged `v4.0.0`; first packaged store release at this version.

---

## Tag history (for reference)

`v4.0.0`, `v.2.3.3`, `v2.3.2`, `v2.3.1`, `v2.2.0`, `v2.1.2`, `v2.1.0`,
`2.0.0`, `v1.0.3`, `v1.0.2`, `v1.0.0.2`, `v1.0.0`

> Full commit history lives in git (`git log`). This file records only
> store-facing release notes.
