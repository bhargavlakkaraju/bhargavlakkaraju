import Script from 'next/script';
import './globals.css';
import { SITE, ADS, ANALYTICS } from '@/lib/site';

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: Free Online Games, No Download`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ['free online games', 'browser games', 'no download games', 'play games online', 'daily challenge games', 'hyper casual games', 'puzzle games', 'arcade games'],
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: '/og/site.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', site: SITE.twitter },
  alternates: { canonical: '/' },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  other: ADS.client ? { 'google-adsense-account': ADS.client } : {},
};

export const viewport = {
  themeColor: SITE.themeColor,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/Fredoka-700.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Nunito-700.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen">
        {children}
        {ADS.client && (
          <Script
            id="adsense"
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS.client}`}
            data-ad-frequency-hint="45s"
            {...(ADS.test ? { 'data-adbreak-test': 'on' } : {})}
          />
        )}
        {ANALYTICS.ga4 && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS.ga4}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ANALYTICS.ga4}');`}
            </Script>
          </>
        )}
        {ANALYTICS.plausibleDomain && <Script defer data-domain={ANALYTICS.plausibleDomain} src="https://plausible.io/js/script.js" strategy="afterInteractive" />}
      </body>
    </html>
  );
}
