import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractHtmlLinks,
  extractHtmlPageLinks,
  looksLikeHtmlPage,
} from '../src/html-extract.js';

describe('html-extract', () => {
  it('extracts a/link/img/script/iframe and resolves relatives', () => {
    const html = `
      <a href="/about/">About</a>
      <link rel="stylesheet" href="assets/site.css"/>
      <img src="https://cdn.example/p.png"/>
      <script src="/app.js"></script>
      <iframe src="https://external.example/embed"></iframe>
      <a href="mailto:x@y.z">mail</a>
      <a href="#top">skip</a>
    `;
    const links = extractHtmlLinks(html, 'https://example.com/docs/');
    assert.ok(links.includes('https://example.com/about/'));
    assert.ok(links.includes('https://example.com/docs/assets/site.css'));
    assert.ok(links.includes('https://cdn.example/p.png'));
    assert.ok(links.includes('https://example.com/app.js'));
    assert.ok(links.includes('https://external.example/embed'));
    assert.ok(!links.some((u) => u.startsWith('mailto:')));
  });

  it('extractHtmlPageLinks only returns anchors', () => {
    const html = `<a href="/a">A</a><img src="/i.png"/><a href="https://x.example/b">B</a>`;
    const links = extractHtmlPageLinks(html, 'https://example.com/');
    assert.deepEqual(links, [
      'https://example.com/a',
      'https://x.example/b',
    ]);
  });

  it('looksLikeHtmlPage filters assets', () => {
    assert.equal(looksLikeHtmlPage('https://ex.com/about/'), true);
    assert.equal(looksLikeHtmlPage('https://ex.com/page'), true);
    assert.equal(looksLikeHtmlPage('https://ex.com/x.html'), true);
    assert.equal(looksLikeHtmlPage('https://ex.com/a.png'), false);
    assert.equal(looksLikeHtmlPage('https://ex.com/a.css'), false);
    assert.equal(looksLikeHtmlPage('https://ex.com/a.js'), false);
  });
});
