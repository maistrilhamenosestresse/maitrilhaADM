import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL('https://www.maistrilhasmenosestresse.com'),
  title: "Mais Trilha Menos Estresse",
  description: "A nossa agenda oficial chegou! Confira nossas próximas trilhas, veja as fotos, roteiros e garanta sua vaga.",
  openGraph: {
    title: "Mais Trilha Menos Estresse",
    description: "A nossa agenda oficial chegou! Confira nossas próximas trilhas, veja as fotos, roteiros e garanta sua vaga.",
    images: [{
      url: 'https://nyavgcggwygkywjboaxh.supabase.co/storage/v1/object/public/fotos_agendas/logo.png',
      width: 1200,
      height: 630,
      alt: 'Mais Trilha Menos Estresse Logo',
    }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Mais Trilha Menos Estresse",
    description: "A nossa agenda oficial chegou! Confira nossas próximas trilhas.",
    images: ['https://nyavgcggwygkywjboaxh.supabase.co/storage/v1/object/public/fotos_agendas/logo.png'],
  },
  icons: {
    icon: 'https://nyavgcggwygkywjboaxh.supabase.co/storage/v1/object/public/fotos_agendas/logo.png',
    shortcut: 'https://nyavgcggwygkywjboaxh.supabase.co/storage/v1/object/public/fotos_agendas/logo.png',
    apple: 'https://nyavgcggwygkywjboaxh.supabase.co/storage/v1/object/public/fotos_agendas/logo.png',
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
