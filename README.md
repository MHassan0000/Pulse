This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Required Environment Variables

Set these in both local `.env.local` and your Vercel project settings:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# MongoDB
MONGODB_URL=
# Also accepted by the app if you prefer these names:
# MONGODB_URI=
# DATABASE_URL=
# Optional but recommended to avoid writing into the default `test` DB
MONGODB_DB_NAME=
# Optional alias:
# MONGODB_DATABASE=

# UploadThing
UPLOADTHING_TOKEN=
UPLOADTHING_SECRET=
```

Important production notes:
- `CLERK_WEBHOOK_SECRET` must match the secret shown for your Clerk webhook endpoint.
- `MONGODB_URL` must be a server-side Mongo URI reachable from Vercel (Atlas IP/network rules must allow access).
- If you omit `MONGODB_DB_NAME`, Mongo writes to the default DB from your URI (often `test`).
- Configure Clerk webhook endpoint as `https://<your-domain>/api/webhooks/clerk` and include these events:
  - `user.created`
  - `user.updated`
  - `user.deleted`
  - `organization.created`
  - `organization.updated`
  - `organization.deleted`
  - `organizationMembership.created`
  - `organizationMembership.deleted`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
