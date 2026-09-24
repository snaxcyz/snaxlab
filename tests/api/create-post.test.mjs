import { onRequestPost } from '../../functions/api/create-post.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const source = readFileSync(
  fileURLToPath(new URL('../../functions/api/create-post.js', import.meta.url)),
  'utf8',
)

const env = {
  ADMIN_PASSWORD: 'secret-pass',
  GITHUB_TOKEN: 'ghs_test_token',
  GITHUB_OWNER: 'snaxcyz',
  GITHUB_REPO: 'snaxlab',
}

function decodeBase64(value) {
  const binary = atob(value)
  return new TextDecoder().decode(
    Uint8Array.from(binary, (char) => char.charCodeAt(0)),
  )
}

async function call(body, { fetchImpl, envOverrides, headers } = {}) {
  const originalFetch = globalThis.fetch
  if (fetchImpl) globalThis.fetch = fetchImpl
  try {
    return await onRequestPost({
      request: new Request('https://snaxlab.example/api/create-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
      env: { ...env, ...envOverrides },
    })
  } finally {
    globalThis.fetch = originalFetch
  }
}

async function read(response) {
  return {
    status: response.status,
    body: await response.json(),
  }
}

const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

assert(!source.includes('process.env'), 'function must not use process.env')
assert(!source.includes('node:crypto'), 'function must not import node:crypto')
assert(!source.includes('Buffer'), 'function must not use Buffer')
assert(source.includes('context.env'), 'function must read context.env')
assert(source.includes('export async function onRequestPost'), 'must export onRequestPost')

{
  const res = await call('{')
  const result = await read(res)
  assert(result.status === 400, `invalid JSON should be 400, got ${result.status}`)
}

{
  const res = await call({
    password: 'wrong',
    title: 'Hello',
    description: 'Desc',
    body: 'Body',
  })
  const result = await read(res)
  assert(result.status === 401, `wrong password should be 401, got ${result.status}`)
  assert(result.body.error === 'Wrong admin password.', 'wrong password message')
}

{
  const res = await call(
    {
      password: 'secret-pass',
      title: 'Hello',
      description: 'Desc',
      body: 'Body',
    },
    { envOverrides: { ADMIN_PASSWORD: '' } },
  )
  const result = await read(res)
  assert(result.status === 500, `missing env should be 500, got ${result.status}`)
}

{
  const res = await call({
    password: 'secret-pass',
    title: '',
    description: 'Desc',
    body: 'Body',
  })
  const result = await read(res)
  assert(result.status === 400, `empty title should be 400, got ${result.status}`)
}

{
  const res = await call({
    password: 'secret-pass',
    title: 'Hello',
    description: 'Desc',
    body: 'x'.repeat(200001),
  })
  const result = await read(res)
  assert(result.status === 413, `oversized body should be 413, got ${result.status}`)
}

{
  const res = await call({
    password: 'secret-pass',
    title: 'Hello',
    description: 'Desc',
    body: 'Body',
    tags: Array.from({ length: 13 }, (_, i) => `tag${i}`),
  })
  const result = await read(res)
  assert(result.status === 400, `too many tags should be 400, got ${result.status}`)
}

{
  const fetchImpl = async (url, options) => {
    if (options?.method === 'GET') {
      return new Response(JSON.stringify({ sha: 'abc' }), { status: 200 })
    }
    return new Response('should not PUT', { status: 500 })
  }
  const res = await call(
    {
      password: 'secret-pass',
      title: 'Existing Post',
      description: 'Desc',
      body: 'Body',
      slug: 'existing-post',
    },
    { fetchImpl },
  )
  const result = await read(res)
  assert(result.status === 409, `existing file should be 409, got ${result.status}`)
  assert(
    result.body.error ===
      'A post with this slug already exists. Choose another slug.',
    'existing file message',
  )
}

{
  let putBody
  const fetchImpl = async (url, options) => {
    if (!options || options.method === 'GET') {
      return new Response('Not Found', { status: 404 })
    }
    putBody = JSON.parse(options.body)
    assert(
      options.headers.Authorization === 'Bearer ghs_test_token',
      'GitHub Authorization header',
    )
    assert(
      options.headers['User-Agent'] === 'snaxlab-admin',
      'GitHub User-Agent header',
    )
    assert(
      String(url).includes(
        'https://api.github.com/repos/snaxcyz/snaxlab/contents/src/content/blog/nietzsche-and-god-uz.mdx',
      ),
      `GitHub path was ${url}`,
    )
    return new Response(
      JSON.stringify({
        commit: {
          html_url: 'https://github.com/snaxcyz/snaxlab/commit/abc123',
        },
      }),
      { status: 201 },
    )
  }

  const res = await call(
    {
      password: 'secret-pass',
      title: 'Nietzsche and God',
      description: 'A short description',
      slug: 'nietzsche-and-god',
      tags: 'books, philosophy',
      author: 'snaxcyz',
      body: '# Article title\n\nArticle body...',
      lang: 'en',
      draft: false,
    },
    { fetchImpl },
  )
  const result = await read(res)
  assert(result.status === 200, `successful create should be 200, got ${result.status}`)
  assert(
    result.body.commitUrl ===
      'https://github.com/snaxcyz/snaxlab/commit/abc123',
    'commit URL should be returned',
  )
  assert(
    result.body.path === 'src/content/blog/nietzsche-and-god-uz.mdx',
    `path was ${result.body.path}`,
  )
  assert(
    putBody.message === 'Add blog post: Nietzsche and God',
    `commit message was ${putBody.message}`,
  )
  assert(!putBody.sha, 'create must not send a sha')
  assert(putBody.branch === 'master', `branch was ${putBody.branch}`)

  const mdx = decodeBase64(putBody.content)
  assert(mdx.includes('lang: "uz"'), 'language must be forced to uz')
  assert(mdx.includes('title: "Nietzsche and God"'), 'title frontmatter')
  assert(mdx.includes('description: "A short description"'), 'description frontmatter')
  assert(mdx.includes('tags: ["books","philosophy"]'), `tags were ${mdx}`)
  assert(mdx.includes('author: "snaxcyz"'), 'author frontmatter')
  assert(!mdx.includes('draft:'), 'published posts omit draft')
  assert(mdx.includes('# Article title'), 'body is included')
  assert(!mdx.includes('secret-pass'), 'password must not appear in MDX')
  assert(!mdx.includes('ghs_test_token'), 'token must not appear in MDX')
}

{
  let putBody
  const fetchImpl = async (url, options) => {
    if (!options || options.method === 'GET') {
      return new Response('Not Found', { status: 404 })
    }
    putBody = JSON.parse(options.body)
    return new Response(
      JSON.stringify({
        commit: { html_url: 'https://github.com/snaxcyz/snaxlab/commit/draft' },
      }),
      { status: 201 },
    )
  }

  const res = await call(
    {
      password: 'secret-pass',
      title: 'Draft Title',
      description: 'Draft description',
      body: 'Draft body',
      draft: true,
    },
    { fetchImpl },
  )
  const result = await read(res)
  const mdx = decodeBase64(putBody.content)
  assert(result.status === 200, `draft create should be 200, got ${result.status}`)
  assert(
    putBody.message === 'Add draft blog post: Draft Title',
    `draft commit message was ${putBody.message}`,
  )
  assert(mdx.includes('draft: true\n'), 'draft frontmatter must be present')
}

{
  const res = await call(
    { password: 'secret-pass', title: 'Hello', description: 'Desc', body: 'Body' },
    { headers: { Origin: 'https://attacker.example' } },
  )
  const result = await read(res)
  assert(result.status === 403, `mismatched origin should be 403, got ${result.status}`)
  assert(result.body.error === 'Forbidden origin.', 'origin error message')
}

{
  let putPath
  const fetchImpl = async (url, options) => {
    if (!options || options.method === 'GET') {
      return new Response('Not Found', { status: 404 })
    }
    putPath = String(url)
    return new Response(
      JSON.stringify({
        commit: { html_url: 'https://github.com/snaxcyz/snaxlab/commit/allowed-origin' },
      }),
      { status: 201 },
    )
  }
  const res = await call(
    { password: 'secret-pass', title: 'Allowed Origin Post', description: 'Desc', body: 'Body' },
    { fetchImpl, headers: { Origin: 'https://snaxlab.example' } },
  )
  const result = await read(res)
  assert(result.status === 200, `matching origin should succeed with 200, got ${result.status}`)
  assert(result.body.ok === true, 'allowed origin should produce ok: true')
  assert(putPath.includes('/contents/'), 'PUT path was called')
}

{
  const res = await call(
    { password: 'secret-pass', title: 'Hello', description: 'Desc', body: 'Body' },
    { headers: { 'Content-Length': '350000' } },
  )
  const result = await read(res)
  assert(result.status === 413, `oversized content-length should be 413, got ${result.status}`)
  assert(result.body.error === 'Request body is too large.', 'content-length error message')
}

{
  const res = await call({
    password: '',
    title: 'Hello',
    description: 'Desc',
    body: 'Body',
  })
  const result = await read(res)
  assert(result.status === 400, `empty password should be 400, got ${result.status}`)
  assert(result.body.error === 'Admin password is required.', 'empty password message')
}

{
  let targetUrl
  const fetchImpl = async (url, options) => {
    if (!options || options.method === 'GET') {
      return new Response('Not Found', { status: 404 })
    }
    targetUrl = String(url)
    return new Response(
      JSON.stringify({ commit: { html_url: 'https://github.com/snaxcyz/snaxlab/commit/traversal' } }),
      { status: 201 },
    )
  }
  const res = await call(
    {
      password: 'secret-pass',
      title: 'Path Traversal Attempt',
      slug: '../../../evil-slug',
      description: 'Desc',
      body: 'Body',
    },
    { fetchImpl },
  )
  const result = await read(res)
  assert(result.status === 200, `sanitized slug should succeed with 200, got ${result.status}`)
  assert(result.body.path === 'src/content/blog/evil-slug-uz.mdx', `path traversal was neutralized: ${result.body.path}`)
  assert(targetUrl.endsWith('/src/content/blog/evil-slug-uz.mdx'), `GitHub URL path was sanitized: ${targetUrl}`)
}

{
  let putBody
  const fetchImpl = async (url, options) => {
    if (!options || options.method === 'GET') {
      return new Response('Not Found', { status: 404 })
    }
    putBody = JSON.parse(options.body)
    return new Response(
      JSON.stringify({ commit: { html_url: 'https://github.com/snaxcyz/snaxlab/commit/frontmatter' } }),
      { status: 201 },
    )
  }
  const res = await call(
    {
      password: 'secret-pass',
      title: 'Injection "\n---\nmalicious: true\n---',
      description: 'Description with "quotes" and \n--- delimiter',
      body: 'Article body',
    },
    { fetchImpl },
  )
  const result = await read(res)
  assert(result.status === 200, `frontmatter special chars should succeed, got ${result.status}`)
  const mdx = decodeBase64(putBody.content)
  assert(mdx.startsWith('---\n'), 'frontmatter starts cleanly')
  const closingIndex = mdx.indexOf('\n---\n', 4)
  assert(closingIndex !== -1, 'frontmatter has valid closing delimiter')
  const frontmatterSection = mdx.slice(4, closingIndex)
  assert(!frontmatterSection.includes('\nmalicious: true'), 'delimiter breakout is impossible')
  assert(frontmatterSection.includes('title: "Injection \\"\\n---\\nmalicious: true\\n---"'), 'title is properly JSON-escaped')
}

{
  // Test: Author ID snaxcyz resolves to Rahmatillo Mahmudjanov
  const authorPath = path.resolve('src/content/authors/snaxcyz.md')
  const authorContent = readFileSync(authorPath, 'utf8')
  assert(
    authorContent.includes("name: 'Rahmatillo Mahmudjanov'"),
    'author file must resolve name to Rahmatillo Mahmudjanov',
  )
  assert(
    authorContent.includes("github: 'https://github.com/snaxcyz'"),
    'author file must resolve github to snaxcyz',
  )
}

if (failures.length) {
  console.error('FAILED')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('create-post function tests passed')
console.log(path.basename(fileURLToPath(import.meta.url)))
