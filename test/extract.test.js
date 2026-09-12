import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractLinks, extractLinksFromFile } from '../src/extract.js';

describe('extractLinks', () => {
  it('extracts markdown links and angle links', () => {
    const text = `
[Node](https://nodejs.org/en/) and <https://example.com/a>.
Bare https://example.com/b end.
`;
    const links = extractLinks(text, 'md');
    assert.ok(links.some((u) => u.includes('nodejs.org')));
    assert.ok(links.some((u) => u.includes('example.com/a')));
    assert.ok(links.some((u) => u.includes('example.com/b')));
  });

  it('dedupes and ignores non-http', () => {
    const text = `
[a](https://example.com/x) [b](https://example.com/x)
[mail](mailto:a@b.com) [rel](./foo.md)
`;
    const links = extractLinks(text, 'md');
    assert.equal(links.length, 1);
    assert.equal(links[0], 'https://example.com/x');
  });

  it('extracts html href and src', () => {
    const html = `<a href="https://example.com/h">x</a><img src="https://example.com/i.png">`;
    const links = extractLinks(html, 'html');
    assert.deepEqual(links.sort(), [
      'https://example.com/h',
      'https://example.com/i.png',
    ]);
  });

  it('extractLinksFromFile picks html kind by extension', () => {
    const { links } = extractLinksFromFile(
      'page.html',
      '<a href="https://example.com/z">z</a>',
    );
    assert.deepEqual(links, ['https://example.com/z']);
  });
});
