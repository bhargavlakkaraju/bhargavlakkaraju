import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { InstallCapture } from '@/components/Widgets';

export default function SiteLayout({ children }) {
  return (
    <>
      <InstallCapture />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
