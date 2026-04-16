# supastarter for Next.js

supastarter is the ultimate starter kit for production-ready, scalable SaaS applications.

## Cursor Cloud development quickstart

### 1) Install dependencies

Run this once from the repository root:

- `pnpm install`

### 2) Configure environment variables

Create `.env.local` (and optionally `.env`) in the repository root with the required values:

- `DATABASE_URL`
- `NEXT_PUBLIC_SAAS_URL` (for example: `http://127.0.0.1:4000`) // pragma: allowlist secret
- `NEXT_PUBLIC_MARKETING_URL` (for example: `http://127.0.0.1:4001`) // pragma: allowlist secret
- `NEXT_PUBLIC_DOCS_URL` (for example: `http://127.0.0.1:4002`) // pragma: allowlist secret
- `NEXT_PUBLIC_AVATARS_BUCKET_NAME`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `MAIL_FROM`
- `RESEND_API_KEY`
- `BETTER_AUTH_SECRET`
- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`

### 3) Start the applications

Use these commands from the repository root:

- `pnpm --filter saas dev` (port `4000`)
- `pnpm --filter marketing dev` (port `4001`)
- `pnpm --filter docs dev` (port `4002`)
- `pnpm --filter mail-preview dev` (port `3003`)

### 4) Verify each service

- SaaS login page: `http://127.0.0.1:4000/login`
- Marketing app: `http://127.0.0.1:4001`
- Docs app: `http://127.0.0.1:4002`
- Mail preview: `http://127.0.0.1:3003`

## Helpful links

- [📘 Documentation](https://supastarter.dev/docs/nextjs)
- [🚀 Demo](https://demo.supastarter.dev)
