import Link from "next/link";

/** Fallback for addresses outside the public site and admin area. */
export default function NotFound() {
  return (
    <main className="flag-backdrop flex min-h-screen flex-col items-center justify-center px-6 text-center text-white">
      <h1 className="text-white">Page Not Found</h1>
      <p className="mt-4 max-w-md text-lg text-white/90">We couldn&apos;t find the page you were looking for.</p>
      <Link href="/" className="btn btn-red btn-lg mt-8">
        Go to the home page
      </Link>
    </main>
  );
}
