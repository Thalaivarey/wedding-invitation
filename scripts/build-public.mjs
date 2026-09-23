// Generate only the public invitations. Family pages use scripts/build.mjs.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const template = await readFile(resolve(root, 'src/public-invitation.html'), 'utf8');
const bride = { name: 'S. Shanmuga Priya', short: 'Shanmuga Priya', initial: 'S', parents: 'K. Selvam & S. Tamil Selvi', label: 'Bride’s parents' };
const groom = { name: 'R. Avinash', short: 'R. Avinash', initial: 'A', parents: 'C. Ramesh & R. Megala', label: 'Groom’s parents' };
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for (const [side, slug, first, second] of [['bride','shanmuga-priya-public',bride,groom],['groom','avinash-public',groom,bride]]) {
  const family = side === 'bride' ? 'bride’s' : 'groom’s';
  const shortNames = `${first.short} & ${second.short}`;
  const values = { side, shortNames, firstName:first.name, secondName:second.name, firstInitial:first.initial,
    secondInitial:second.initial, monogram:`${first.initial} & ${second.initial}`,
    familyInvitation:`An invitation from the ${family} family`,
    invitationMessage:`With joyful hearts, our family invites you to celebrate the wedding of ${first.short} and ${second.short}.`,
    pageTitle:`${shortNames} | Wedding Invitation`,
    description:`The ${family} family invites you to celebrate ${first.name} and ${second.name} · 29–30 October 2026 · Chennai.`,
    canonicalUrl:`https://wedding-invitation-snowy-kappa.vercel.app/${slug}/`,
    firstParentLabel:first.label, secondParentLabel:second.label, firstParents:first.parents, secondParents:second.parents, assetPrefix:'../' };
  const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => { if (!(key in values)) throw Error(`Unknown public token ${key}`); return escape(values[key]); });
  await mkdir(resolve(root, slug), { recursive:true });
  await writeFile(resolve(root, slug, 'index.html'), html);
  console.log(`Built ${slug}/index.html`);
}
