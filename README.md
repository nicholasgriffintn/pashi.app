# Pashi

The home for side projects. Named for the manga SFX `pashi`: a crisp smack or click of impact.

[https://pashi.app](https://pashi.app)

## What is here

Pashi has three layers on one domain.

- **Hub** at `/` lists every project, including the ones that live on their own subdomains.
- **Tools** at `/tools` is the console: 79 generators and 18 converters, with exports to JSON, CSV and TXT. Text conversion runs in the Worker; media and document conversion runs in a container behind a queue.
- **Labs** at `/labs` is where AI experiments live before they earn a permanent home. Ask Pashi routes a plain English request to the right tool and fills its form.

Every tool is also a URL. See [/api](https://pashi.app/api) for the documentation, generated from the live catalogue, or [/api/info](https://pashi.app/api/info) for the raw contract.

## Agent access

An MCP endpoint at `/mcp` exposes three meta tools rather than one per generator, so an agent can work without flooding its context.

- `pashi_list_tools` finds a tool id, optionally filtered by search or kind.
- `pashi_generate` runs a generator.
- `pashi_convert` runs a text converter. Media and document conversion is not available over MCP.

It needs an API key and speaks JSON-RPC over POST.

## API access

Workers AI requests, the Labs endpoints and container-backed converters require an application API key. Send it in either `Authorization: Bearer <api-key>` or `X-API-Key`. Everything else is open, rate limited per IP address.

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

Your application will be available at [http://localhost:5173](http://localhost:5173).

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

Service health, including the feature flags and bindings, is at `/api/health`.

## Checks

```bash
pnpm check        # typecheck the app and the worker
pnpm lint         # oxlint
pnpm format:check # oxfmt
pnpm build        # tsc and vite build
pnpm test:smoke   # playwright smoke suite against the built worker
```

There are no unit tests here, on purpose.
