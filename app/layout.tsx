import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trust Issues",
  description: "An interactive 3D character viewer",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
