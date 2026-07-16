import Link from "next/link";
import { requireOwnerSessionPage } from "@/lib/auth";

const SECOES = [
  {
    href: "/configuracoes/servicos",
    title: "Serviços",
    description: "Cadastro dos serviços da barbearia (nome, duração, preço de tabela).",
  },
  {
    href: "/configuracoes/barbeiros",
    title: "Barbeiros & Horários",
    description: "Barbeiros, grade semanal de trabalho e folgas/bloqueios.",
  },
  {
    href: "/configuracoes/agenda",
    title: "Agenda",
    description: "Passo de horário, antecedência mínima, falta e confirmação.",
  },
  {
    href: "/configuracoes/inatividade",
    title: "Inatividade",
    description: "Dias sem visita para considerar o cliente inativo.",
  },
];

export default async function ConfiguracoesHubPage() {
  await requireOwnerSessionPage();
  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-black uppercase text-ink">Configurações</h1>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECOES.map((secao) => (
          <li key={secao.href}>
            <Link href={secao.href} className="card-blade block hover:border-gold">
              <p className="font-display text-lg font-bold uppercase text-ink">{secao.title}</p>
              <p className="mt-1 text-sm text-steel">{secao.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
