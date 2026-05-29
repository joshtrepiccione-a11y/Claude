import { NextRequest, NextResponse } from 'next/server';

interface SignupPayload {
  name?: string;
  email?: string;
  phone?: string;
  zip?: string;
  interest?: string;
  source?: string;
}

function sanitize(input: SignupPayload) {
  const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return {
    name:     trim(input.name),
    email:    trim(input.email).toLowerCase(),
    phone:    trim(input.phone),
    zip:      trim(input.zip),
    interest: trim(input.interest),
    source:   trim(input.source) || 'unknown',
  };
}

function validate(p: ReturnType<typeof sanitize>): string | null {
  if (!p.email) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return 'Invalid email address.';
  if (p.phone && p.phone.replace(/\D/g, '').length < 10) return 'Invalid phone number.';
  if (p.zip && !/^\d{5}(-\d{4})?$/.test(p.zip)) return 'Invalid ZIP code.';
  return null;
}

export async function POST(req: NextRequest) {
  let body: SignupPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const payload = sanitize(body);
  const error = validate(payload);
  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 422 });
  }

  // TODO: integrate a CRM or email service here.
  // Options include Mailchimp, Resend, ActionNetwork, or ActBlue integrations.
  // For now, log the submission server-side.
  console.log('[signup]', JSON.stringify({ ...payload, ts: new Date().toISOString() }));

  return NextResponse.json({ ok: true });
}
