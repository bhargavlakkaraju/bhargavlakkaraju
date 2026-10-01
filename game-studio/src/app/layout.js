import { metaDescription } from '@/lib/seo';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { SITE, ADS, ANALYTICS, SOCIAL, VERIFY } from '@/lib/site';

const CONSENT_REGIONS = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'];
const CONSENT_DEFAULTS = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500,region:${JSON.stringify(CONSENT_REGIONS)}});`;

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: Free Online Games, No Download`,
    template: `%s | ${SITE.name}`,
  },
  description: metaDescription(SITE.description),
  applicationName: SITE.name,
  keywords: ['free online games', 'browser games', 'no download games', 'play games online', 'daily challenge games', 'hyper casual games', 'puzzle games', 'arcade games'],
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: '/og/site.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', site: SITE.twitter },
  alternates: { canonical: '/' },
  // Let Google show big image and video previews (needed for Google Discover).
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  verification: {
    ...(VERIFY.google ? { google: VERIFY.google } : {}),
    ...(VERIFY.yandex ? { yandex: VERIFY.yandex } : {}),
    other: {
      ...(VERIFY.bing ? { 'msvalidate.01': VERIFY.bing } : {}),
      ...(VERIFY.pinterest ? { 'p:domain_verify': VERIFY.pinterest } : {}),
      ...(VERIFY.facebook ? { 'facebook-domain-verification': VERIFY.facebook } : {}),
    },
  },
  other: ADS.client ? { 'google-adsense-account': ADS.client } : {},
};

// Who we are, for search engines and AI answer engines: one Organization + WebSite
// entity, linked to our social profiles so they are recognised as the same brand.
const ORG_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE.url}/#org`,
      name: SITE.name,
      url: SITE.url,
      logo: { '@type': 'ImageObject', url: `${SITE.url}/icons/icon-512.png`, width: 512, height: 512 },
      slogan: SITE.tagline,
      description: SITE.description,
      email: SITE.email,
      sameAs: SOCIAL.map((s) => s.url),
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE.url}/#website`,
      name: SITE.name,
      alternateName: 'RetryArcade',
      url: SITE.url,
      description: SITE.description,
      inLanguage: 'en',
      publisher: { '@id': `${SITE.url}/#org` },
    },
  ],
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
        {ADS.display === 'ezoic' && (
          <>
            {/* Ezoic asks for its consent + ad scripts first in <head>, loaded unconditionally. */}
            <script data-cfasync="false" src="https://cmp.gatekeeperconsent.com/min.js" />
            <script data-cfasync="false" src="https://the.gatekeeperconsent.com/cmp.min.js" />
            <script async src="https://www.ezojs.com/ezoic/sa.min.js" />
            <script dangerouslySetInnerHTML={{ __html: 'window.ezstandalone=window.ezstandalone||{};ezstandalone.cmd=ezstandalone.cmd||[];' }} />
            <script src="https://ezoicanalytics.com/analytics.js" />
          </>
        )}
        {/* Google Consent Mode v2: EU, EEA, UK and Swiss visitors start with ad and analytics storage
            denied (Google sends cookieless pings only) until a consent banner grants it. Must run before
            gtag and AdSense load. Everyone else is unaffected. */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULTS }} />
        <link rel="preload" href="/fonts/Fredoka-700.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Nunito-700.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="alternate" type="text/plain" title="LLM summary" href="/llms.txt" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_LD) }} />
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
        {/* Vercel Web Analytics: collects as soon as it is switched on in the Vercel dashboard. */}
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  );
}
