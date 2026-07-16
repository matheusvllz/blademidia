"use client";

interface Props {
  occupied: number;
  capacity: number;
}

/** "N/M · P% cheia" (spec "Indicador de ocupação na grade semanal"); sem grade → indisponível. */
export function AgendaOccupancyBadge({ occupied, capacity }: Props) {
  if (capacity === 0) {
    return <span className="font-mono text-xs text-wire">ocupação indisponível (sem grade)</span>;
  }
  const pct = Math.round((occupied / capacity) * 1000) / 10;
  return (
    <span className="badge-ativo">
      {occupied}/{capacity} · {pct}% cheia
    </span>
  );
}
