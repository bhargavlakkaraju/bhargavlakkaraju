import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { InstallCapture } from '@/components/Widgets';
import { BottomNav } from '@/components/Nav';

function NeonBackdrop() {
  return (
    <div className="neon-backdrop" aria-hidden>
      <div className="stars" />
      <div className="sun" />
      <div className="floor" />
    </div>
  );
}

export default function SiteLayout({ children }) {
  return (
    <>
      <NeonBackdrop />
      <InstallCapture />
      <Header />
      <main>{children}</main>
      <Footer />
      <BottomNav />
    </>
  );
}
