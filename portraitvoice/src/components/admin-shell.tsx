import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
export function AdminShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="page-shell admin-page">
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <nav className="admin-nav" aria-label="Internal navigation">
        <Link to="/admin" activeOptions={{ exact: true }}>
          Entries
        </Link>
        <Link to="/admin/usage">Credit usage</Link>
      </nav>
      <p className="internal-note">
        <ShieldAlert size={16} /> Internal view · Accessible to anyone with this
        URL. No authentication is enabled.
      </p>
      {children}
    </main>
  );
}
