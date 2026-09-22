// One shared template generates both family invitations and the original URL.
// Run `node scripts/build.mjs` after editing src/invitation.html or the details here.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://wedding-invitation-snowy-kappa.vercel.app';
const template = await readFile(resolve(root, 'src/invitation.html'), 'utf8');
const bride = { name: 'S. Shanmuga Priya', short: 'Shanmuga Priya', initial: 'S', parents: 'K. Selvam & S. Tamil Selvi', label: "Bride’s parents" };
const groom = { name: 'R. Avinash', short: 'R. Avinash', initial: 'A', parents: 'C. Ramesh & R. Megala', label: "Groom’s parents" };
const versions = [
  { side: 'bride', slug: 'shanmuga-priya', first: bride, second: groom,
    phones: [{ number: '919841772326', label: '98417 72326' }, { number: '916380317543', label: '63803 17543' }] },
  { side: 'groom', slug: 'avinash', first: groom, second: bride,
    phones: [{ number: '919790557142', label: '97905 57142' }] }
];
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

for (const version of versions) {
  const { first, second, side, slug, phones } = version;
  const shortNames = `${first.short} & ${second.short}`;
  const family = side === 'bride' ? 'bride’s' : 'groom’s';
  const values = {
    side,
    firstName: first.name,
    secondName: second.name,
    shortNames,
    firstInitial: first.initial,
    secondInitial: second.initial,
    monogram: `${first.initial} & ${second.initial}`,
    familyInvitation: `An invitation from the ${family} family`,
    invitationMessage: `With joyful hearts, our family invites you to celebrate the wedding of ${first.short} and ${second.short}.`,
    pageTitle: `${shortNames} | Wedding Invitation`,
    description: `The ${family} family invites you to celebrate ${first.name} and ${second.name} · 29–30 October 2026 · Chennai.`,
    canonicalUrl: `${origin}/${slug}/`,
    firstParentLabel: first.label,
    secondParentLabel: second.label,
    firstParents: first.parents,
    secondParents: second.parents,
    contactLabel: `Contact the ${family} family`,
    whatsappNumber: phones[0].number
  };
  const contacts = phones.map(({ number, label }) => `<a href="tel:+${escape(number)}">${escape(label)}</a>`).join('<span aria-hidden="true">·</span>');

  for (const output of side === 'bride' ? ['index.html', `${slug}/index.html`] : [`${slug}/index.html`]) {
    const tokens = { ...values, assetPrefix: output === 'index.html' ? '' : '../' };
    const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (key === 'contactLinks') return contacts;
      if (!(key in tokens)) throw new Error(`Unknown template token: ${key}`);
      return escape(tokens[key]);
    });
    const destination = resolve(root, output);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, html);
    console.log(`Built ${output}`);
  }
}
