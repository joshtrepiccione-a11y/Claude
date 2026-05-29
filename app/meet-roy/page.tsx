import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Meet Roy — Roy Cooper for North Carolina',
};

const TIMELINE = [
  { year: '1957', title: 'Born in Nashville, NC',
    copy: 'Raised in a small farming community by parents who believed in public service and public schools.' },
  { year: '1986', title: 'Elected to the NC General Assembly',
    copy: 'Began a career representing rural and small-town North Carolina in the state legislature.' },
  { year: '2001', title: 'Sworn in as Attorney General',
    copy: 'Served four terms — taking on price-gougers, defending consumers, and clearing the rape-kit backlog.' },
  { year: '2017', title: 'Sworn in as the 75th Governor',
    copy: 'Led North Carolina through hurricanes, a pandemic, and a historic period of economic recruitment.' },
  { year: '2023', title: 'Medicaid Expansion delivered',
    copy: 'After a decade-long fight, expanded health coverage to more than 600,000 North Carolinians.' },
  { year: 'Today', title: 'Fighting for North Carolina',
    copy: 'On the road, in every county, making the case that government should make stuff cost less and work better.' },
];

export default function MeetRoy() {
  return (
    <>
      <div className="page-hero">
        <h1>Meet Roy</h1>
        <p>
          Raised in Nashville, NC. Four terms as Attorney General. Two terms as Governor.
          Now asking North Carolinians to join him in the next chapter.
        </p>
      </div>

      <div className="page-content">
        <div className="bio-section">
          <div className="bio-portrait" aria-hidden="true">
            Portrait photo
          </div>
          <div className="bio-text">
            <p>
              Roy Cooper grew up in Nashville, North Carolina — the son of a teacher and a
              lawyer who taught him that public institutions only work when ordinary people
              insist they do. He carried that lesson through the state legislature, four
              terms as Attorney General, and two terms as Governor.
            </p>
            <p>
              As Governor he expanded Medicaid to more than 600,000 North Carolinians,
              recruited record-breaking economic investment to every region of the state,
              raised teacher pay each year he was in office, and led the state through
              Hurricanes Florence, Matthew, and Helene as well as the COVID-19 pandemic.
            </p>
            <p>
              Now he&apos;s asking North Carolinians to join him in the next chapter — a
              campaign focused on making everyday life more affordable, defending the
              freedom to vote, and proving that pragmatic, prepared leadership still
              delivers.
            </p>
          </div>
        </div>

        <h2
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 900,
            fontSize: 32,
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            marginBottom: 0,
          }}
        >
          A record of results
        </h2>

        <div className="timeline">
          {TIMELINE.map((m) => (
            <div className="milestone" key={m.year}>
              <div className="milestone-year">{m.year}</div>
              <div className="milestone-body">
                <h4>{m.title}</h4>
                <p>{m.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cta-strip">
        <h2>Join the Team</h2>
        <Link href="/" className="cta-strip-btn" style={{ display: 'inline-block' }}>
          Sign up now
        </Link>
      </div>
    </>
  );
}
