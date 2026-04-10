import { ScratchExperience } from "@/components/ScratchExperience";

type Props = { params: Promise<{ publicToken: string }> };

export default async function RaspePage({ params }: Props) {
  const { publicToken } = await params;
  return (
    <main className="min-h-screen">
      <ScratchExperience publicToken={publicToken} />
    </main>
  );
}
