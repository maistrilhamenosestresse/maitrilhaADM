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
  description: "Conheça um pouco da nossa história. Somos uma comunidade apaixonada pela natureza, aventura e bem-estar. Venha se desconectar do estresse e se reconectar com a vida através de trilhas incríveis!",
  openGraph: {
    title: "Mais Trilha Menos Estresse",
    description: "Conheça um pouco da nossa história. Somos uma comunidade apaixonada pela natureza, aventura e bem-estar. Venha se desconectar do estresse e se reconectar com a vida através de trilhas incríveis!",
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
    description: "Conheça um pouco da nossa história. Venha se desconectar do estresse e se reconectar com a vida através do ecoturismo!",
    images: ['https://nyavgcggwygkywjboaxh.supabase.co/storage/v1/object/public/fotos_agendas/logo.png'],
  },
  icons: {
    icon: 'https://nyavgcggwygkywjboaxh.supabase.co/storage/v1/object/public/fotos_agendas/logo.png',
    shortcut: 'https://nyavgcggwygkywjboaxh.supabase.co/storage/v1/object/public/fotos_agendas/logo.png',
    apple: 'https://nyavgcggwygkywjboaxh.supabase.co/storage/v1/object/public/fotos_agendas/logo.png',
  },
  manifest: '/manifest.json'
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
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col max-w-full overflow-x-hidden">
        {/* Isca para o Warsaw (Diebold Nixdorf) - Evita Hydration Mismatch */}
        <div id="_tela" style={{ display: 'none' }}></div>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
