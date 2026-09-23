# SnaxLab Admin Setup

This project includes a private admin dashboard for publishing Astro/MDX blog posts without manually committing files to GitHub.

## What was added

- `src/pages/admin/index.astro` — private writing dashboard
- `functions/api/create-post.js` — Cloudflare Pages Function that creates `.mdx` blog posts in GitHub

The dashboard creates files like:

```txt
src/content/blog/my-article-uz.mdx
```

The generated frontmatter matches this project’s content schema:

```mdx
---
title: "My Article"
description: "Short summary"
date: "2026-09-16"
lang: "uz"
tags: ["coding"]
authors: ["enscribe"]
---

Article body...
```

## Required environment variables

Add these in Cloudflare Dashboard → Pages → your project → Settings → Environment variables (Production, and Preview if needed):

```env
ADMIN_PASSWORD=choose_a_strong_private_password
GITHUB_TOKEN=your_fine_grained_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repo_name
GITHUB_BRANCH=master
```

`GITHUB_BRANCH` defaults to `master` if it is not set.

## GitHub token permissions

Create a fine-grained GitHub token for only this repository.

It needs repository **Contents: Read and write** permission, because the Cloudflare Pages Function creates new files in `src/content/blog`.

## How to use

1. Deploy the site on Cloudflare Pages.
2. Open `/admin` on your site.
3. Enter the admin password.
4. Write title, description, slug, tags, authors, and article body.
5. Click **Publish to SnaxLab**.
6. The function creates a new MDX file in GitHub.
7. Cloudflare Pages rebuilds your site from the new commit.

The publish flow is:

`/admin` → `/api/create-post` → Cloudflare Pages Function → GitHub Contents API → `src/content/blog/<slug>-uz.mdx` → Pages rebuild

## Cloudflare Pages build settings

- Build command: `npm run build`
- Build output directory: `dist`
- Functions directory: `functions` (picked up automatically)

## API security

- **Password is server-side**: `ADMIN_PASSWORD` is injected into `functions/api/create-post.js` via Cloudflare Pages environment bindings (`context.env`). It is never bundled into client scripts or public HTML, and is never stored in `localStorage` or `sessionStorage`.
- **GitHub token is server-side**: `GITHUB_TOKEN` is used only in the serverless function (`context.env.GITHUB_TOKEN`) to commit to GitHub; it is never exposed to the client or returned in API responses.
- **Origin validation**: The endpoint validates the `Origin` header against the canonical site URL to block unauthorized cross-origin browser requests (`403 Forbidden`).
- **Request-size protection**: Pre-parse `Content-Length` checks reject oversized payloads (`> 300,000` bytes) with `413 Payload Too Large` to prevent memory exhaustion, followed by strict post-parse field length limits (body <= 200,000 characters).
- **Sanitized errors**: Internal errors and GitHub API responses are mapped to static, non-revealing error messages; no stack traces, raw upstream bodies, or secrets are leaked.
- **Timing-safe authentication**: Password comparison uses Web Cryptography HMAC-SHA256 constant-time evaluation with modest backoff delay on failed attempts.
- **HTTP security headers**: `public/_headers` applies `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Frame-Options: DENY` / `Content-Security-Policy: frame-ancestors 'none'` to prevent clickjacking on `/admin`.

## Cloudflare rate limiting

To protect `/api/create-post` from automated brute-force password guessing, configure a Rate Limiting Rule in the Cloudflare Dashboard:

```text
Path: /api/create-post
Method: POST
Rate: approximately 5 requests/minute/IP
Action: Block (429) or an appropriate managed challenge
```

> **Note**: This is an external Cloudflare Dashboard WAF configuration. It is not managed in this repository, is not currently verified as enabled, and requires manual verification in your Cloudflare Dashboard.
