'use client';
import { useEffect, useRef, useState } from 'react';
import { SMS_TERMS } from '@/lib/constants';

const STORAGE_KEY = 'rc_supporter';

interface Saved {
  name: string;
  email: string;
  phone: string;
}

export default function Home() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState<Saved | null>(null);
  const [status, setStatus] = useState<{ text: string; kind: 'info' | 'ok' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: Saved = JSON.parse(raw);
        setSaved(data);
        setName(data.name ?? '');
        setEmail(data.email ?? '');
        setPhone(data.phone ?? '');
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  function handleNotYou() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
    setSaved(null);
    setName('');
    setEmail('');
    setPhone('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: name.trim(), email: email.trim(), phone: phone.trim() };

    if (!payload.name) return setStatus({ text: 'Please enter your name.', kind: 'error' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
      return setStatus({ text: 'Please enter a valid email.', kind: 'error' });
    if (payload.phone && payload.phone.replace(/\D/g, '').length < 10)
      return setStatus({ text: 'Please enter a valid mobile number, or leave it blank.', kind: 'error' });

    setSubmitting(true);
    setStatus({ text: 'Submitting…', kind: 'info' });

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, source: 'home_hero' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');

      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* */ }
      setSaved(payload);
      setStatus({ text: "You're on the team. Thank you.", kind: 'ok' });
    } catch {
      setStatus({ text: 'Something went wrong. Please try again.', kind: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="hero">
      <div className="hero-photo" aria-hidden="true" />
      <div className="hero-inner">
        <h1>Fighting for<br />North Carolina</h1>
        <form className="signup" onSubmit={handleSubmit} ref={formRef} noValidate>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
          <div className="field-row">
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
          <button className="submit-btn" type="submit" disabled={submitting}>
            Join the Team
          </button>
          {status && (
            <p className={`form-status ${status.kind}`}>{status.text}</p>
          )}
          {saved && (
            <p className="not-you">
              Not {saved.name || 'you'}?{' '}
              <button type="button" onClick={handleNotYou}>
                Click here.
              </button>
            </p>
          )}
          <p
            className="terms"
            dangerouslySetInnerHTML={{ __html: SMS_TERMS }}
          />
        </form>
      </div>
    </section>
  );
}
