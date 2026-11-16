import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How American Legion Post 186 handles information you share through this website.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Privacy" lead="What this website collects, and what we do with it." />
      <div className="container-page py-12 md:py-16">
        <div className="prose-post max-w-3xl">
          <h2 className="!mt-0 text-2xl md:text-3xl">The short version</h2>
          <p>
            This website does not use advertising, tracking pixels or third-party analytics. We only collect what
            you choose to send us through a form, and we use it only to answer you.
          </p>

          <h2 className="text-2xl md:text-3xl">Information you send us</h2>
          <ul>
            <li>
              <strong>Hall rental requests:</strong> your name, phone, email and the details of your event. Post
              officers use this to review your request and contact you about it.
            </li>
            <li>
              <strong>Contact messages:</strong> your name, email, optional phone number and your message. They are
              delivered to the post and, if you choose one, to the officer you addressed.
            </li>
          </ul>
          <p>
            Only authorized post officers can see this information. We do not sell, rent or share it with anyone
            outside the post, except where the law requires it.
          </p>

          <h2 className="text-2xl md:text-3xl">Cookies</h2>
          <p>
            Visitors to the public pages receive no cookies. The officer sign-in area uses a single cookie that
            keeps an officer signed in; it is not used for tracking.
          </p>

          <h2 className="text-2xl md:text-3xl">Keeping information safe</h2>
          <p>
            The site is served over an encrypted connection. To limit abuse of our forms, the network address a
            submission comes from is kept for up to a day to enforce a submission limit; it is not stored with your
            message.
          </p>
          <p>
            Please do not send Social Security numbers, medical records or other sensitive personal details through
            this website. An accredited service officer can tell you the safe way to share documents for a claim.
          </p>

          <h2 className="text-2xl md:text-3xl">Links to other sites</h2>
          <p>
            The footer links to legion.org and other outside websites. Their privacy practices are their own.
          </p>

          <h2 className="text-2xl md:text-3xl">Questions or removal requests</h2>
          <p>
            To ask what we hold about you, or to have a message or rental request removed,{" "}
            <Link href="/officers#contact">contact the post</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
