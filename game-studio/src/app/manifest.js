import { SITE } from '@/lib/site';

// Installable PWA: "Add to Home Screen" puts the arcade one tap away (retention).
export default function manifest() {
  return {
    name: SITE.name,
    short_name: SITE.short,
    description: SITE.description,
    start_url: '/?utm_source=pwa',
    display: 'standalone',
    orientation: 'portrait',
    background_color: SITE.themeColor,
    theme_color: SITE.themeColor,
    categories: ['games', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
