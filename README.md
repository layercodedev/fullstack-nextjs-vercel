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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## IMPORTANT LAYERCODE INFO: When deploying to Vercel, you MUST disable Vercel Authentication to allow Layercode webhooks to be received

By default, Vercel blocks external requests to your application /api routes. This means that Layercode webhooks will not be received by your application, and your voice agent will not work.

Disable Vercel Authentication by going to your project settings in the Vercel dashboard, then go to "Deployment Protection" in left sidebar menu, then turn off "Vercel Authentication" and Save. You do not need to redeploy.

![disable-vercel-auth.png]

Remember to check your Webhook Logs in the Layercode dashboard to ensure that webhooks are being received successfully. If you receive a 405 error response to webhooks, this indicates that Vercel Authentication is still enabled.
