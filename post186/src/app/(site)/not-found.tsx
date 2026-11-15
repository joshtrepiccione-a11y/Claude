import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page Not Found" lead="We couldn't find the page you were looking for. It may have moved." />
      <div className="container-page py-12 md:py-16">
        <p className="max-w-2xl text-lg">Here are some places to start:</p>
        <ul className="mt-5 flex flex-wrap gap-3">
          <li>
            <Link href="/" className="btn btn-navy">
              Home
            </Link>
          </li>
          <li>
            <Link href="/events" className="btn btn-outline">
              Events
            </Link>
          </li>
          <li>
            <Link href="/hall-rental" className="btn btn-outline">
              Hall Rental
            </Link>
          </li>
          <li>
            <Link href="/officers#contact" className="btn btn-outline">
              Officers &amp; Contact
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
