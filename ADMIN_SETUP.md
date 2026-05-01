# SnaxLab Admin Setup

This project now includes a custom private admin dashboard for publishing Astro/MDX blog posts without manually committing files to GitHub.

## What was added

- `src/pages/admin/index.astro` — modern private writing dashboard
- `netlify/functions/create-post.mjs` — secure backend function that creates `.mdx` blog posts in GitHub

The dashboard creates files like:

```txt
src/content/blog/my-article-uz.mdx
```

The generated frontmatter matches this project’s content schema:

```mdx
---
title: "My Article"
description: "Short description"
date: 2026-04-29
lang: "uz"
translationId: "my-article"
tags: ["coding"]
authors: ["enscribe"]
---

Article body...
```

## Required environment variables

Add these in Netlify Dashboard → Site configuration → Environment variables:

```env
ADMIN_PASSWORD=choose_a_strong_private_password
GITHUB_TOKEN=your_fine_grained_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repo_name
GITHUB_BRANCH=main
```

## GitHub token permissions

Create a fine-grained GitHub token for only this repository.

It needs repository **Contents: Read and write** permission, because the Netlify Function creates new files in `src/content/blog`.

## How to use

1. Deploy the site on Netlify.
2. Open `/admin` on your site.
3. Enter the admin password.
4. Write title, description, tags, language, and article body.
5. Click **Publish to SnaxLab**.
6. The function creates a new MDX file in GitHub.
7. Netlify rebuilds your site from the new commit.

## Important security note

The GitHub token is used only inside `netlify/functions/create-post.mjs`.
Never put your GitHub token inside browser JavaScript, Astro components, or public files.
