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
GITHUB_BRANCH=main
```

`GITHUB_BRANCH` defaults to `main` if it is not set.

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

## Important security note

The GitHub token is used only inside `functions/api/create-post.js`.
Never put your GitHub token inside browser JavaScript, Astro components, or public files.

The admin password is never stored in `localStorage`.
