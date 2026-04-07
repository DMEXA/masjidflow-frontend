import { redirect } from 'next/navigation';

type LegacyInvitePageProps = {
  searchParams?: {
    token?: string;
  };
};

export default function InvitePage({ searchParams }: LegacyInvitePageProps) {
  const token = typeof searchParams?.token === 'string' ? searchParams.token.trim() : '';
  if (!token) {
    redirect('/invite/member');
  }

  redirect(`/invite/member?token=${encodeURIComponent(token)}`);
}
