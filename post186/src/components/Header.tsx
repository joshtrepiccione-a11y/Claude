import Link from "next/link";
import { Brandmark } from "./Brandmark";
import { Nav } from "./Nav";

export function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="header-brand" aria-label="Frank M. Calletta American Legion Post 186, home">
          <Brandmark variant="primary" />
        </Link>
        <Nav />
      </div>
    </header>
  );
}
