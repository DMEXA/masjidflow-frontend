import { redirect } from 'next/navigation';

type LegacyMuqtadiInvitePageProps = {
  params: {
    token: string;
  };
};

export default function MuqtadiInvitePage({ params }: LegacyMuqtadiInvitePageProps) {
  const token = typeof params?.token === 'string' ? params.token.trim() : '';
  if (!token) {
    redirect('/login');
  }

  redirect(`/invite/muqtadi/${encodeURIComponent(token)}`);
}
