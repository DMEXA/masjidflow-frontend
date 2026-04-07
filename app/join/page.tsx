import { redirect } from 'next/navigation';

type JoinPageProps = {
  searchParams?: {
    token?: string;
  };
};

export default function JoinPage({ searchParams }: JoinPageProps) {
  const token = typeof searchParams?.token === 'string' ? searchParams.token.trim() : '';

  if (!token) {
    redirect('/login');
  }

  redirect(`/invite/member?token=${encodeURIComponent(token)}`);
}
