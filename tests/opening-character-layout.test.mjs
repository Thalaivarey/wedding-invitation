import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
for (const page of ['src/public-invitation.html', 'shanmuga-priya-public/index.html', 'avinash-public/index.html']) {
  test(`${page}: the full character cannot split into clipped head/body pieces`, async () => {
    const html = await readFile(new URL(page, root), 'utf8');
    const character = html.slice(html.indexOf('id="openingCharacter"'), html.indexOf('</svg>', html.indexOf('id="openingCharacter"')));
    const images = [...character.matchAll(/<image\b[^>]*>/g)];
    assert.equal(images.length, 1, 'The character must be drawn once to preserve neck and shoulder continuity');
    assert(!images[0][0].includes('clip-path'), 'Full artwork must not be cut into body or head pieces');
    assert(!character.includes('characterBodyClip') && !character.includes('characterHeadClip'));
    const [left, top, width, height] = character.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    assert(left <= 255 && left + width >= 825, 'Horizontal framing must include the original full silhouette');
    assert(top <= -64 && top + height >= 1600, 'Head and feet need extra framing room during motion');
  });
}
