'use client';
import { useState } from 'react';
import { DONATE_URL } from '@/lib/constants';

const ACTIONS = [
  { title: 'Donate', copy: 'Chip in to help us reach voters in every county.', cta: 'Give Now', kind: 'donate' },
  { title: 'Volunteer', copy: 'Knock doors, make calls, register voters — pick what fits your schedule.', cta: 'Sign Up', kind: 'volunteer' },
  { title: 'Host an Event', copy: 'Bring the campaign to your neighborhood, church, or living room.', cta: 'Get Started', kind: 'host' },
  { title: 'Get a Yard Sign', copy: 'Show your neighbors where you stand.', cta: 'Request One', kind: 'sign' },
];

const INTERESTS = [
  { label: 'How do you want to help?', value: '' },
  { label: 'Volunteering', value: 'volunteer' },
  { label: 'Hosting an event', value: 'host' },
  { label: 'Voter registration', value: 'voter_reg' },
  { label: 'Yard sign', value: 'sign' },
  { label: 'Just keep me informed', value: 'subscribe' },
];

export default function GetInvolved() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [zip, setZip] = useState('');
  const [interest, setInterest] = useState('');
  const [status, setStatus] = useState<{ text: string; kind: 'info' | 'ok' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function selectAction(kind: string) {
    if (kind === 'donate') {
      window.open(DONATE_URL, '_blank', 'noopener noreferrer');
      return;
    }
    setInterest(kind);
    document.getElementById('gi-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      zip: zip.trim(),
      interest,
    };

    if (!payload.name) return setStatus({ text: 'Please enter your name.', kind: 'error' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
      return setStatus({ text: 'Please enter a valid email.', kind: 'error' });
    if (payload.zip && !/^\d{5}(-\d{4})?$/.test(payload.zip))
      return setStatus({ text: 'Please enter a valid ZIP code.', kind: 'error' });

    setSubmitting(true);
    setStatus({ text: 'Submitting…', kind: 'info' });

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, source: 'get_involved' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');

      setStatus({ text: "Thanks — we'll be in touch soon.", kind: 'ok' });
      setName(''); setEmail(''); setPhone(''); setZip(''); setInterest('');
    } catch {
      setStatus({ text: 'Something went wrong. Please try again.', kind: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-hero">
        <h1>Get Involved</h1>
        <p>Every county. Every community. Pick how you want to make a difference.</p>
      </div>

      <div className="page-content">
        <div className="card-grid">
          {ACTIONS.map((a) => (
            <div className="card" key={a.kind}>
              <h3>{a.title}</h3>
              <p>{a.copy}</p>
              <button className="card-btn" onClick={() => selectAction(a.kind)}>
                {a.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="gi-form-section" id="gi-form">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2>Join the Team</h2>
          <form className="gi-form" onSubmit={handleSubmit} noValidate>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
            <div className="gi-four">
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <input
                type="tel"
                placeholder="Mobile Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="gi-four">
              <input
                type="text"
                placeholder="ZIP Code"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={10}
              />
              <select value={interest} onChange={(e) => setInterest(e.target.value)}>
                {INTERESTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button className="submit-btn" type="submit" disabled={submitting}>
              Join the Team
            </button>
            {status && <p className={`form-status ${status.kind}`}>{status.text}</p>}
          </form>
        </div>
      </div>
    </>
  );
}
