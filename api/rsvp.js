const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const webhookUrl = process.env.ZOHO_FLOW_RSVP_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('ZOHO_FLOW_RSVP_WEBHOOK_URL is not configured.');
    return res.status(503).json({ error: 'RSVP service is not configured yet.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (body.website) return res.status(202).json({ ok: true });

  const clean = (value, max = 200) => String(value || '').trim().slice(0, max);
  const name = clean(body.name, 80);
  const email = clean(body.email, 120).toLowerCase();
  let phone = clean(body.phone, 20).replace(/[^\d+]/g, '');
  const attendance = clean(body.attendance, 10);
  const guests = clean(body.guests, 3);
  const message = clean(body.message, 500);
  const side = ['bride', 'groom'].includes(body.side) ? body.side : 'unknown';
  const sourceUrl = clean(body.source_url, 500);
  const consent = body.consent === true || body.consent === 'on' || body.consent === 'true';

  if (/^\d{10}$/.test(phone)) phone = '+91' + phone;
  if (!name || !email || !phone || !consent || !['yes','maybe','no'].includes(attendance)) {
    return res.status(400).json({ error: 'Please complete all required RSVP fields.' });
  }
  if (!/^\+?[1-9]\d{7,14}$/.test(phone)) {
    return res.status(400).json({ error: 'Please enter a valid mobile number.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const submittedAt = new Date().toISOString();
  const idempotencyKey = crypto
    .createHash('sha256')
    .update([email, phone, side].join('|'))
    .digest('hex');

  const payload = {
    name,
    email,
    phone,
    attendance,
    guests,
    message,
    side,
    source_url: sourceUrl,
    consent: true,
    submitted_at: submittedAt,
    idempotency_key: idempotencyKey,
    wedding_date: '2026-10-30',
    reminder_date: '2026-10-28'
  };

  try {
    const zohoResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!zohoResponse.ok) {
      const text = await zohoResponse.text();
      console.error('Zoho Flow rejected RSVP:', zohoResponse.status, text.slice(0, 500));
      return res.status(502).json({ error: 'RSVP could not be saved. Please try again.' });
    }
    return res.status(202).json({ ok: true });
  } catch (error) {
    console.error('Zoho Flow RSVP error:', error);
    return res.status(502).json({ error: 'RSVP service is temporarily unavailable.' });
  }
};
