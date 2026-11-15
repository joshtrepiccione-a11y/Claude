import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { StatusForm } from "@/components/site/StatusForm";

export const metadata: Metadata = {
  title: "Check a Hall Request",
  description: "Check the status of your hall rental request at American Legion Post 186.",
  alternates: { canonical: "/hall-rental/status" },
  robots: { index: false },
};

export default function StatusPage() {
  return (
    <>
      <PageHeader
        title="Check Your Request"
        lead="Enter the reference from your confirmation and the email address you used."
        crumbs={[{ href: "/hall-rental", label: "Hall Rental" }]}
      />
      <div className="container-page py-12 md:py-16">
        <div className="max-w-xl">
          <StatusForm />
          <p className="mt-10">
            Lost your reference?{" "}
            <Link href="/officers#contact" className="link">
              Contact the post
            </Link>{" "}
            and we will look it up for you.
          </p>
        </div>
      </div>
    </>
  );
}
