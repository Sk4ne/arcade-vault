import type { Metadata } from "next";
import { Suspense } from "react";

import { HallOfFame, resolveHallGame } from "@/components/hall-of-fame";

export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
  description: "Los mejores jugadores de cada juego del Vault.",
};

// Reads the request-time `?juego=` param; lives inside <Suspense> so the
// rest of the page (header, tabs, loading state) stays in the static shell.
async function HallForRequest({
  searchParams,
}: Pick<PageProps<"/salon">, "searchParams">) {
  const { juego } = await searchParams;
  return <HallOfFame gameId={resolveHallGame(juego)} />;
}

export default function HallPage({ searchParams }: PageProps<"/salon">) {
  return (
    <Suspense fallback={<HallOfFame />}>
      <HallForRequest searchParams={searchParams} />
    </Suspense>
  );
}
