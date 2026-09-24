import ProfileView from './ProfileView';

export const metadata = {
  title: 'Your Profile: Level, Streak and Medals',
  robots: { index: false },
};

export default function ProfilePage() {
  return <ProfileView />;
}
