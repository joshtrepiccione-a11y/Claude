import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { RichText } from "@/components/RichText";
import { Pending } from "@/components/Pending";
import { getSiteContent } from "@/lib/content";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About the Post",
  description: `The history, namesake, mission, and leadership of ${SITE.name} in Hammonton, NJ.`,
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const c = await getSiteContent();
  const officers = c.about_officers.split("\n").map((l) => l.trim()).filter(Boolean);
  const timeline = c.about_timeline.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <PublicShell>
      <div className="container page-intro">
        <h1>About Post 186</h1>
        <p className="lead">Veterans of every era, serving one another and the town of Hammonton.</p>
      </div>

      <section className="section" aria-labelledby="history">
        <div className="container">
          <h2 id="history">Our history</h2>
          {c.about_history ? <RichText text={c.about_history} /> : <Pending>The Post&apos;s history is being written by our members and will be published here soon.</Pending>}
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="namesake">
        <div className="container">
          <h2 id="namesake">Frank M. Calletta</h2>
          {c.about_namesake ? (
            <RichText text={c.about_namesake} />
          ) : (
            <Pending>The story of Frank M. Calletta and why Post 186 carries his name will be published here once it has been reviewed by the Post.</Pending>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="mission">
        <div className="container">
          <h2 id="mission">Mission and community service</h2>
          <RichText text={c.about_mission} />
        </div>
      </section>

      <section className="section section-gray" aria-labelledby="leadership">
        <div className="container">
          <h2 id="leadership">Officers and leadership</h2>
          {officers.length ? (
            <ul className="fact-list">
              {officers.map((line) => {
                const [role, ...rest] = line.split(":");
                const name = rest.join(":").trim();
                return (
                  <li key={line}>
                    <strong>{name ? role.trim() : "Officer"}</strong>
                    {name || role}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Pending>Current officer names will be listed here after the Post confirms them.</Pending>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="gallery">
        <div className="container">
          <h2 id="gallery">Through the years</h2>
          {timeline.length ? (
            <ol className="timeline">
              {timeline.map((line) => {
                const m = line.match(/^(\d{4})\s*[-:]\s*(.*)$/);
                return (
                  <li key={line}>
                    {m ? (
                      <>
                        <strong>{m[1]}</strong> &nbsp;{m[2]}
                      </>
                    ) : (
                      line
                    )}
                  </li>
                );
              })}
            </ol>
          ) : null}
          <ul className="gallery" aria-label="Photo gallery" style={{ marginTop: timeline.length ? "1.5rem" : 0 }}>
            {["Members at the hall", "A ceremony on French Street", "Community service in Hammonton", "The Post today"].map((caption) => (
              <li key={caption} className="gallery-slot">
                Photo coming soon: {caption}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PublicShell>
  );
}
