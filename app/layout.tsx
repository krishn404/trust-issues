import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trust Issues",
  description: "Extern",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="overflow-hidden font-[Arial,Helvetica,sans-serif]">{children}</body>
    </html>
  );
}
