import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Router · Demo Mode",
  description:
    "Know if a delivery order is worth it before the timer runs out.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
