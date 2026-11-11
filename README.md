# Pashi

The home for side projects. Named for the manga SFX `pashi`: a crisp smack or click of impact.

[https://pashi.app](https://pashi.app)

## What is here

Pashi has three layers on one domain.

- **Hub** at `/` lists every project, including the ones that live on their own subdomains.
- **Tools** at `/tools` is the console: 79 generators and 18 converters, with exports to JSON, CSV and TXT. Text conversion runs in the Worker; media and document conversion runs in a container behind a queue.
- **Labs** at `/labs` is where AI experiments live before they earn a permanent home. Ask Pashi routes a plain English request to the right tool, runs it when the tool is simple and otherwise opens it with the form filled in.

Every tool is also a URL. See [/api](https://pashi.app/api) for the documentation, generated from the live catalogue, [/api/info](https://pashi.app/api/info) for the raw contract, or [/api/openapi.json](https://pashi.app/api/openapi.json) for an OpenAPI 3.1 document covering every path.

Press `K` anywhere, or the search button, to open the command palette: tools, pages, projects and actions in one list. Pin the tools you use most from there.

## Agent access

An MCP endpoint at `/mcp` exposes four meta tools rather than one per generator, so an agent can work without flooding its context.

- `pashi_list_tools` finds a tool id, optionally filtered by search or kind.
- `pashi_describe_tool` describes one tool's input and options.
- `pashi_generate` runs a generator.
- `pashi_convert` runs a text converter. Media and document conversion is not available over MCP.

It speaks JSON-RPC over POST. The meta tools work without a credential and are rate limited per IP address. AI mode needs a Polychat link. Everything else takes either a Pashi API key or the Polychat link token as a bearer token.

Two Labs tools need a Polychat link.

- `pashi_ask` routes a plain English request to a tool and runs it when it is simple.
- `pashi_explain` explains a cron schedule, curl command, JWT, regular expression or SQL statement.

### MCP Apps

Pashi's views and games are [MCP Apps](https://modelcontextprotocol.io/specification/draft/apps): `ui://pashi/...` resources served from `/mcp` as self-contained HTML that a host renders in a sandboxed frame.

- `pashi_generate` and `pashi_convert` link `ui://pashi/generator` and `ui://pashi/converter`, which show the result with its options editable and run it again from the view.
- `pashi_play_charades` links `ui://pashi/charades`. You act a card on camera for six seconds and an AI audience guesses it. The judging runs on the linked Polychat account, so it needs the link token rather than an API key.
- `pashi_open_strudel` links `ui://pashi/strudel`. You describe a groove, a model writes the Strudel pattern, and you live-code it in the Strudel editor and keep it in your pattern library on Pashi.
- `pashi_open_verbatim` links `ui://pashi/verbatim`. Live transcription that listens twice: Workers AI transcribes each phrase, then a decision model on the linked Polychat account checks every word against the audio and strikes out what it cannot hear.
- `pashi_open_polis` links `ui://pashi/polis`. You found a town of up to 50,000 people, pass laws in plain English and stage disasters, and residents decide through the linked Polychat account (Workers AI without a link). Shared towns replay at `/polis/<token>`.
- A tool that opens an app on its own carries `_meta["app.polychat/app"]` (name, description, category, icon, theme, when, uses, produces, surface) next to its `_meta.ui.resourceUri`. It is read-only and needs no arguments, so a host can open the app by calling it with `{}`.

To try them, add `https://pashi.app/mcp` as an MCP server in Polychat (or any host that renders MCP Apps), then ask for a password or a Jira conversion. Add your token to ask for a game of Charades.

## API access

AI runs on [Polychat](https://polychat.app). AI mode and the Labs endpoints need a connected Polychat account, and usage counts against that account's plan.

Container-backed converters need an application API key or a connected Polychat Pro account. Send a key in either `Authorization: Bearer <api-key>` or `X-API-Key`. Everything else is open, rate limited per IP address.

Locally, `pnpm dev` seeds a permanent development key into the local KV store the first time it runs, and writes it to `.env.local` so the sign-in page can offer it with one click. Run `pnpm seed:dev` to do the seeding on its own.

Applications and key records live in the `APPLICATIONS` KV namespace, like this:

```text
applications:v1:<application-id>
api-keys:v1:<sha256-of-api-key>
```

Provision an application and a high-entropy key:

Generate a key and copy into your clipboard:

```bash
openssl rand -hex 32
```

Set the key in your environment:

```bash
export PASHI_API_KEY="<your-api-key>"
```

```bash
export PASHI_API_KEY_DIGEST="$(printf '%s' "$PASHI_API_KEY" | openssl dgst -sha256 -r | cut -d ' ' -f 1)"

pnpm exec wrangler kv key put --remote --binding APPLICATIONS \
  "applications:v1:example-app" \
  '{"id":"example-app","name":"Example application","enabled":true}'

pnpm exec wrangler kv key put --remote --binding APPLICATIONS \
  "api-keys:v1:${PASHI_API_KEY_DIGEST}" \
  '{"applicationId":"example-app","enabled":true}'
```

## Development

Install dependencies:

```bash
pnpm install
```

Start the development server with:

```bash
pnpm dev
```

Your application will be available at [http://localhost:5180](http://localhost:5180).

## Production

Build your project for production:

```bash
pnpm build
```

Preview your build locally:

```bash
pnpm preview
```

Deploy your project to Cloudflare Workers:

```bash
pnpm build && pnpm deploy
```

Monitor your workers:

```bash
npx wrangler tail
```

## Operations

Conversion jobs and their uploads expire after 24 hours. Set the matching bucket lifecycle rule once:

```bash
pnpm exec wrangler r2 bucket lifecycle add pashi-conversions --prefix conversions/ --expire-days 1
```

Permanently failed conversions land in the `pashi-conversions-dlq` queue. Inspect it with:

```bash
pnpm exec wrangler queues list
```

Service health, including the feature flags and bindings, is at `/api/health`. Usage is recorded to the `pashi_events` Analytics Engine dataset: tool runs, AI calls, conversions, exports and rate limits.

Social cards are generated per page at `/og?path=/tools/uuid`, drawn from the same catalogue as everything else.

The AI features have golden cases behind `POST /api/labs/evaluate`, which needs a connected Polychat account and returns 424 when any case fails.

## Checks

```bash
pnpm check        # typecheck the app and the worker
pnpm lint         # oxlint
pnpm format:check # oxfmt
pnpm build        # tsc and vite build
pnpm test:smoke   # playwright smoke suite against the built worker
```

There are no unit tests here, on purpose. The smoke suite starts the real Worker in preview rather than mocking it, so it needs Docker for the converter container.
