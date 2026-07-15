const LABELS: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

const CLASSES: Record<string, string> = {
  agendado: "bg-steel/10 text-steel",
  confirmado: "bg-alert-green/10 text-alert-green",
  concluido: "bg-gold/20 text-gold-dark",
  cancelado: "bg-wire/10 text-wire line-through",
  faltou: "bg-alert-red/10 text-alert-red",
};

export function AppointmentStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${CLASSES[status] ?? "bg-steel/10 text-steel"}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
