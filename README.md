# Pashi

Tiny generators for quick output.

## Functionality

Pashi takes its name from the manga SFX `pashi`: a crisp smack or click of impact.

Go to [https://pashi.app/](https://pashi.app/) to see it in action. You can generate from a wide range of categories depending on your needs.

Pashi also features exports to various formats, including JSON, CSV, and SQL, making it easy to integrate generated data into your projects.

And if you'd like to use Pashi in your own projects, you can access the API at [https://pashi.app/api](https://pashi.app/api) to generate data programmatically. Go to [https://pashi.app/api/info](https://pashi.app/api/info) for more information on how to use the API.

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
