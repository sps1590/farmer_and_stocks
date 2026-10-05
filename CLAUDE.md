@AGENTS.md

# Krishi Bazar AI — project instructions

Read [PROGRESS.md](PROGRESS.md) first and update its "What's built" section
and changelog whenever a feature or schema change lands.

- Tap-only UX is a hard product rule: never add a text input for users.
- New UI strings go into both `en` and `bn` in `src/lib/i18n.ts`.
- Server-only data access in `src/lib/*.ts`; mutations only in
  `src/lib/actions/*.ts` ("use server"), validated with zod, and always scoped
  to the device from `requireDevice()` — never an id sent by the client.
- Schema changes in `src/lib/schema.ts` must be idempotent (IF NOT EXISTS).
- All SQL uses the tagged template or `sql.query(text, params)`; never
  concatenate user input.
- Cron routes must check `isCronAuthorized()`; Python compute endpoints check
  `x-internal-secret` against `CRON_SECRET`.
- Never present a forecast as certain: show the 95% range and mark series
  with < 20 tested months as "low data".
- Run `npm run lint && npm run typecheck && npm test && npm run test:py`
  before committing.
- Animation: CSS classes in `globals.css` for entrances/ambient motion; Motion
  (`m.*` from `motion/react`, never `motion.*` — LazyMotion is strict) for layout,
  presence and spring animations. Everything must respect reduced motion.
