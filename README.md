# Wedding invitations

Two family-specific links, one shared design and source template:

- `/shanmuga-priya/` — bride first; bride’s family contacts.
- `/avinash/` — R. Avinash first; groom’s family contact.
- `/` — preserves the original link with the bride’s version.

Edit `src/invitation.html` for shared content and `scripts/build.mjs` for names,
family order and contacts, then run:

```sh
node scripts/build.mjs
node --test tests/invitation.test.mjs
```

Commit all three generated HTML files together. They are intentionally static:
named URLs work on direct visits, reloads and link previews without JavaScript
or a runtime database. All versions share `style.css`, `script.js` and `assets/`.
The existing static Vercel deployment needs no new dependencies or routing rules.

The opening uses a bounded canvas particle effect for mouse/touch interaction.
It pauses for reduced-motion preferences, when the tab is hidden, or when a guest
chooses Pause animation; it stops completely after the invitation opens. The
closing photograph is never used as a cropped full-screen background.
