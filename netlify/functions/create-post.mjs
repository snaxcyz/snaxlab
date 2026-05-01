import { timingSafeEqual } from 'node:crypto'

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
})

function slugify(value = '') {
  return value
    .toLowerCase()
    .trim()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function yamlString(value = '') {
  return JSON.stringify(String(value))
}

function isPasswordMatch(inputPassword, expectedPassword) {
  const input = Buffer.from(String(inputPassword || ''))
  const expected = Buffer.from(String(expectedPassword || ''))

  return (
    input.length === expected.length &&
    expected.length > 0 &&
    timingSafeEqual(input, expected)
  )
}

function cleanList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return fallback
}

function makeMdx(data) {
  const draftLine = data.draft ? 'draft: true\n' : ''

  return `---
title: ${yamlString(data.title)}
description: ${yamlString(data.description)}
date: ${new Date().toISOString().slice(0, 10)}
lang: ${yamlString(data.lang)}
translationId: ${yamlString(data.translationId)}
tags: ${JSON.stringify(data.tags)}
authors: ${JSON.stringify(data.authors)}
${draftLine}---

${data.body}
`
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const requiredEnv = [
      'ADMIN_PASSWORD',
      'GITHUB_TOKEN',
      'GITHUB_OWNER',
      'GITHUB_REPO',
    ]

    const missing = requiredEnv.filter((key) => !process.env[key])
    if (missing.length) {
      return json(500, {
        error: `Missing environment variables: ${missing.join(', ')}`,
      })
    }

    let input
    try {
      input = JSON.parse(event.body || '{}')
    } catch {
      return json(400, { error: 'Invalid JSON request body.' })
    }

    if (!isPasswordMatch(input.password, process.env.ADMIN_PASSWORD)) {
      return json(401, { error: 'Wrong admin password.' })
    }

    const title = String(input.title || '').trim().slice(0, 120)
    const description = String(input.description || '').trim().slice(0, 240)
    const body = String(input.body || '').trim()
    const lang = input.lang === 'en' ? 'en' : 'uz'
    const slug = slugify(input.slug || title)
    const translationId = slugify(input.translationId || slug)
    const tags = cleanList(input.tags)
    const authors = cleanList(input.authors, ['enscribe'])
    const draft = Boolean(input.draft)

    if (!title || !description || !body || !slug) {
      return json(400, {
        error: 'Title, description, slug, and article body are required.',
      })
    }

    if (body.length > 200000) {
      return json(413, { error: 'Article body is too large.' })
    }

    if (tags.length > 12 || authors.length > 6) {
      return json(400, {
        error: 'Too many tags or authors. Use up to 12 tags and 6 authors.',
      })
    }

    const owner = process.env.GITHUB_OWNER
    const repo = process.env.GITHUB_REPO
    const branch = process.env.GITHUB_BRANCH || 'main'
    const filePath = `src/content/blog/${slug}-${lang}.mdx`
    const mdxContent = makeMdx({
      title,
      description,
      body,
      lang,
      slug,
      translationId,
      tags,
      authors,
      draft,
    })

    const token = process.env.GITHUB_TOKEN
    const encodedContent = Buffer.from(mdxContent, 'utf8').toString('base64')

    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'snaxlab-admin',
        },
        body: JSON.stringify({
          message: `Add blog post: ${title}`,
          content: encodedContent,
          branch,
        }),
      },
    )

    const githubData = await githubResponse
      .json()
      .catch(() => ({ message: 'GitHub returned an invalid response.' }))

    if (!githubResponse.ok) {
      return json(githubResponse.status, {
        error: githubData.message || 'GitHub upload failed.',
      })
    }

    return json(200, {
      ok: true,
      filePath,
      commitUrl: githubData.commit?.html_url,
    })
  } catch (error) {
    return json(500, { error: error.message || 'Unexpected server error.' })
  }
}
