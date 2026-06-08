# Pashi

Generates useful little things in a flash

## API

### QR Code Generator

Generate a QR code for a URL:

```txt
GET /api/qr?data=https%3A%2F%2Fpashi.app
```

Optional query parameters:

- `format`: `png` or `svg` (defaults to `png`)
- `size`: dimensions such as `300x300` (defaults to `300x300`)

## Development

Install dependencies:

```bash
npm install
```

Start the development server with:

```bash
npm run dev
```

Your application will be available at [http://localhost:5173](http://localhost:5173).

## Production

Build your project for production:

```bash
npm run build
```

Preview your build locally:

```bash
npm run preview
```

Deploy your project to Cloudflare Workers:

```bash
npm run build && npm run deploy
```

Monitor your workers:

```bash
npx wrangler tail
```
