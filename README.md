# Pashi

Tiny generators for quick output.

## Functionality

Pashi takes its name from the manga SFX `pashi`: a crisp smack or click of impact.

Go to [https://pashi.app/](https://pashi.app/) to see it in action. You can generate from a wide range of categories depending on your needs.

Pashi also features exports to various formats, including JSON, CSV, and TXT, making it easy to integrate generated data into your projects.

And if you'd like to use Pashi in your own projects, you can access the API at [https://pashi.app/api](https://pashi.app/api) to generate data programmatically. Go to [https://pashi.app/api/info](https://pashi.app/api/info) for more information on how to use the API.

## API access

Workers AI requests and container-backed converters require an application API key. A valid key also lets an identified bot pass the global bot blocker. Send the key in either `Authorization: Bearer <api-key>` or `X-API-Key`.

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
