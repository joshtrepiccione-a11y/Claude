import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { RichText } from "@/components/RichText";
import { MembershipForm } from "@/components/forms/MembershipForm";
import { getSiteContent } from "@/lib/content";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Membership",
  description: "Ask about joining American Legion Post 186 in Hammonton, NJ. Fellowship, benefits help, and a voice for veterans.",
  alternates: { canonical: "/membership" },
};

export default async function MembershipPage() {
  const c = await getSiteContent();
  return (
    <PublicShell>
      <div className="container page-intro">
        <h1>Membership</h1>
        <p className="lead">Join a Post that shows up for its veterans and its town.</p>
      </div>

      <section className="section" aria-labelledby="why-join">
        <div className="container">
          <div className="grid grid-2">
            <div>
              <h2 id="why-join">Why join Post 186</h2>
              <RichText text={c.membership_overview} />
              {c.membership_meeting ? (
                <p className="prose">
                  <strong>Regular meetings:</strong> {c.membership_meeting}
                </p>
              ) : null}
              {c.membership_dues ? (
                <p className="prose">
                  <strong>Annual dues:</strong> {c.membership_dues}
                </p>
              ) : null}
            </div>
            <div>
              <h2>Who is eligible</h2>
              <p className="prose">
                Eligibility for The American Legion is set nationally and is broader than many people expect. Rather than repeat rules that can change, we link straight to the source:
              </p>
              <div className="detail-actions">
                <a href={SITE.legionEligibilityUrl} className="btn btn-outline" rel="noopener">
                  Official American Legion eligibility information
                </a>
              </div>
              <p className="prose">
                Spouses, children, and grandchildren of eligible veterans may qualify for the American Legion Auxiliary or the Sons of The American Legion. If you are unsure where you fit, send the inquiry below and we will help you sort it out.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="inquiry">
        <div className="container">
          <h2 id="inquiry">Send a membership inquiry</h2>
          <p className="lead">
            This form is an inquiry, not a membership application, and it does not determine eligibility. It simply lets us know you are interested so a member can follow up.
          </p>
          <MembershipForm responseTime={c.response_time} />
        </div>
      </section>
    </PublicShell>
  );
}
