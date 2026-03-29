import type { Metadata } from "next";

const title = "Ontario installer grant calculator widget | GreenerCheck";
const description =
  "Add a branded Ontario Greener Homes grant calculator to your solar or heat pump website. Free 30-day trial.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/for-installers",
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/for-installers",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function ForInstallersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
