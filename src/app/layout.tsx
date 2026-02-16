import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinFlow - SaaS Finance & Billing Platform",
  description:
    "Complete financial management with invoicing, billing, inventory tracking, and AI-automated workflows.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
