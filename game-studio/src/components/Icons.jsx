// Small inline icons (24px grid, currentColor) so the chrome stays crisp and consistent.
const I = ({ children, className = 'h-5 w-5', fill = false }) => (
  <svg viewBox="0 0 24 24" className={className} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export const IconSearch = (p) => (
  <I {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </I>
);
export const IconHome = (p) => (
  <I {...p} fill>
    <path d="M11.3 2.7a1 1 0 0 1 1.4 0l8 7.6A1 1 0 0 1 20 12h-1v7a2 2 0 0 1-2 2h-3v-5.5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1V21H7a2 2 0 0 1-2-2v-7H4a1 1 0 0 1-.7-1.7z" />
  </I>
);
export const IconCalendar = (p) => (
  <I {...p} fill>
    <path d="M8 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm11 8H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1zM8 12h3v3H8z" />
  </I>
);
export const IconTrophy = (p) => (
  <I {...p} fill>
    <path d="M6 3h12v2h3v3a4 4 0 0 1-4 4h-.3A6 6 0 0 1 13 15.9V18h3a1 1 0 0 1 1 1v2H7v-2a1 1 0 0 1 1-1h3v-2.1A6 6 0 0 1 7.3 12H7a4 4 0 0 1-4-4V5h3zm12 4v3a2 2 0 0 0 1-2V7zM5 7v1a2 2 0 0 0 1 2V7z" />
  </I>
);
export const IconUser = (p) => (
  <I {...p} fill>
    <path d="M12 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 12c4.4 0 8 2.2 8 5v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1c0-2.8 3.6-5 8-5Z" />
  </I>
);
export const IconDice = (p) => (
  <I {...p} fill>
    <path d="M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm2 3.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-4 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-4 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
  </I>
);
export const IconArrow = (p) => (
  <I {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </I>
);
export const IconPlay = (p) => (
  <I {...p} fill>
    <path d="M8 5.1v13.8a1 1 0 0 0 1.5.9l11-6.9a1 1 0 0 0 0-1.8l-11-6.9A1 1 0 0 0 8 5.1Z" />
  </I>
);
export const IconClose = (p) => (
  <I {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </I>
);
