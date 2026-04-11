import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Unauthorized</h1>
      <p className="text-muted-foreground">
        You do not have permission to access this page.
      </p>
      <Link
        href="/app/announcements"
        className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
      >
        Go to Announcements
      </Link>
    </main>
  );
}
