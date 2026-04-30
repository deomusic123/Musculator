import { LiveSessionShell } from "@/components/live/live-session-shell";

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;

  return <LiveSessionShell sessionId={id} />;
}
