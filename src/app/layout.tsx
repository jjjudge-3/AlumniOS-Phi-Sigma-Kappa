import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlumniOS",
  description: "Fraternity alumni intelligence and opportunity tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
