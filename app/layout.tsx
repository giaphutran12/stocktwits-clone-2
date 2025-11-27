import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stolk",
  description: "A social platform for stock traders",
  icons: {
    icon: "/phosphor-icons/SVGs/light/chart-line-up-light.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ClerkProvider wraps your entire app and provides authentication context.
    // Think of it like a "manager" that keeps track of who is logged in.
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {/* Header is a client component to avoid Clerk hydration issues */}
          <Header />
          {children}
          {/* Toast notifications - bottom right by default */}
          <Toaster position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
