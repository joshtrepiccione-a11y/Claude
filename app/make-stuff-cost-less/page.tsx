import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Make Stuff Cost Less — Roy Cooper for North Carolina',
};

const TOPICS = [
  { title: 'Groceries', anchor: 'groceries',
    summary: 'Crack down on price gouging and corporate concentration so a trip to the store doesn\'t blow the budget.' },
  { title: 'Prescription Drugs', anchor: 'prescriptions',
    summary: 'Cap the cost of insulin and inhalers, and let the state negotiate prices for the medicines families rely on.' },
  { title: 'Housing', anchor: 'housing',
    summary: 'Build more homes near where people work, expand first-time buyer help, and stop predatory landlord practices.' },
  { title: 'Energy & Utilities', anchor: 'energy',
    summary: 'Hold monopoly utilities accountable and cut bills with weatherization, rooftop solar, and a modern grid.' },
  { title: 'Child Care', anchor: 'childcare',
    summary: 'Make quality child care affordable so parents can work — and providers can actually pay their staff.' },
  { title: 'Health Care', anchor: 'health',
    summary: 'Defend Medicaid expansion, lower premiums on the marketplace, and protect rural hospitals.' },
];

export default function MakeStuffCostLess() {
  return (
    <>
      <div className="page-hero">
        <h1>Make Stuff Cost Less</h1>
        <p>
          Working families are paying more for less. The campaign&apos;s plan is built on
          what works, not what polls — groceries, prescriptions, housing, and energy.
        </p>
      </div>

      <div className="page-content">
        <div className="card-grid">
          {TOPICS.map((t) => (
            <div className="card" key={t.anchor} id={t.anchor}>
              <h3>{t.title}</h3>
              <p>{t.summary}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="cta-strip">
        <h2>Join the Fight</h2>
        <Link href="/" className="cta-strip-btn" style={{ display: 'inline-block' }}>
          Sign up now
        </Link>
      </div>
    </>
  );
}
