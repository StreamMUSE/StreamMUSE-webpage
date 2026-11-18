import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
function loadTs(path) {
  const source = readFileSync(path, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(require, module, module.exports)
  return module.exports
}

const PublicationEntry = loadTs('src/components/PublicationEntry.tsx').default
const { streamMuseVersions } = loadTs('src/data/versions.ts')

test('both publications share Paper and collapsed Citation controls without fabricated resources', () => {
  const published = streamMuseVersions.filter(version => version.publication)
  assert.deepEqual(published.map(version => version.slug), ['v0', 'v2'])
  for (const version of published) {
    const html = renderToStaticMarkup(React.createElement(PublicationEntry, { version }))
    assert.match(html, /Paper<\/a>/)
    assert.match(html, /aria-expanded="false"/)
    assert.match(html, /hidden=""/)
    assert.ok(html.indexOf('publication-authors') < html.indexOf('publication-venue'))
    assert.ok(html.includes(version.publication.paperUrl.replaceAll('&', '&amp;')))
    assert.equal(html.includes('> Code</a>'), Boolean(version.links.code))
  }
  assert.match(published[1].publication.bibtex, /^@misc\{/)
  assert.doesNotMatch(published[1].publication.bibtex, /doi\s*=/)
})
