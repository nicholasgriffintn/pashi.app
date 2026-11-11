# Pashi

Pashi (https://pashi.app) is the home for side projects: a hub that lists projects, a tools console (generators and converters), and a labs area for AI experiments. It runs as one Cloudflare Worker (Hono) serving a React SPA, with Containers, Queues, R2 and KV behind the converters.

## Layout

- `src/react-app` — the SPA. Routes orchestrate; logic lives in `lib/` and `components/`.
- `src/worker` — the Worker. `routes` compose `services`; `utils` holds shared helpers.
- `src/shared` — types and contracts imported by both halves. Never import DOM or Worker globals here.
- `src/shared-ui` — React components and styles shared by the SPA and the MCP views.
- `containers/converter` — the Node container that runs ffmpeg, ImageMagick and pandoc.

## Rules

- **No unit tests.** The `test` script says so on purpose. A small Playwright smoke suite is acceptable; nothing unit-level.
- **Tool metadata lives in the catalogue only.** Never branch on a tool id string in UI or worker code. Add a capability flag to the tool definition instead.
- **Ids and aliases must be unique across generators and converters.** Generators match first, so a shared alias silently breaks the converter. The catalogue self-check throws at load if this is violated.
- **British spelling** in identifiers and copy (`colour`, `normalise`, `catalogue`).
- **Design tokens only.** Colours, shadows, radii and spacing come from the token block at the top of `src/react-app/index.css`. No raw hex in component CSS.
- **Bound every generator.** Anything that loops on a user-supplied count, range or notation must have an explicit budget and return 422 when exceeded.
- **One canonical path per thing.** No compatibility aliases, no version prefixes, no redirects kept "just in case". If a path changes, change it.

## Commands

```bash
pnpm dev            # seeds the local dev API key, then vite + workers runtime on http://localhost:5180
pnpm seed:dev       # seed the local dev API key on its own
pnpm check          # typecheck app + worker
pnpm lint           # oxlint
pnpm format         # oxfmt
pnpm build          # tsc + vite build
pnpm deploy         # wrangler deploy
pnpm types          # regenerate worker-configuration.d.ts (gitignored)
```

Secrets go in `.dev.vars` (see `.dev.vars.example`). Never commit them.
