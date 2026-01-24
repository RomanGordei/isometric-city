import type { Metadata } from 'next';

interface Props {
  params: Promise<{ roomCode: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomCode } = await params;
  const code = roomCode.toUpperCase();
  
  const title = `Join co-op ${code}`;
  const fullTitle = `ISOCOASTER — ${title}`;
  const description = `You've been invited to build a theme park together! Join room ${code} to start playing.`;

  return {
    title,
    description,
    openGraph: {
      title: fullTitle,
      description,
      siteName: 'IsoCoaster',
      images: ['/coaster/opengraph-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: ['/coaster/opengraph-image.png'],
    },
  };
}

export default function CoasterCoopRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
