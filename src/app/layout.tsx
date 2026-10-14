import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FM Tactical Builder",
  description: "Build, diagnose, and compare Football Manager tactical structures.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
