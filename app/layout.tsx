import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ashara Ohbat 1448H",
  description: "Live Relay Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
