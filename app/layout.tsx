import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stocky - Interactive Stock Explorer",
  description: "Track, compare, and explore stocks with a beautiful, interactive interface. Real-time data, drag-to-reorder, and seamless experience.",
  keywords: ["stocks", "finance", "trading", "stock market", "portfolio", "investment", "real-time data"],
  authors: [{ name: "vdutts" }],
  creator: "vdutts",
  publisher: "vdutts",
  metadataBase: new URL("https://stocky-kpcysbqt4-misty-emaners-projects.vercel.app"),
  openGraph: {
    title: "Stocky - Interactive Stock Explorer",
    description: "Track, compare, and explore stocks with a beautiful, interactive interface",
    url: "https://stocky-kpcysbqt4-misty-emaners-projects.vercel.app",
    siteName: "Stocky",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Stocky - Interactive Stock Explorer",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stocky - Interactive Stock Explorer",
    description: "Track, compare, and explore stocks with a beautiful, interactive interface",
    images: ["/og-image.png"],
    creator: "@vdutts",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stocky",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://logo.clearbit.com" />
        <link rel="dns-prefetch" href="https://logo.clearbit.com" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
