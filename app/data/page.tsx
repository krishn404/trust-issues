import type { Metadata } from "next";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Data",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function DataPage() {
  return <Dashboard />;
}
