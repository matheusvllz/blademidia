/**
 * Liga `confirmationAutomationEnabled` para uma barbearia — não existe UI de painel para isto
 * de propósito (change `add-confirmacao-agendamento`, Non-Goal: ativação é operação interna,
 * não self-service). Valida que a barbearia já tem `whatsappPhoneNumberId` configurado antes
 * de ligar — nunca deixa uma barbearia "pronta para confirmar" sem ter como enviar
 * (design.md, Decision 5). Rodar só depois de o template de confirmação estar aprovado pela
 * Meta para aquela barbearia.
 *
 * Uso:
 *   tsx src/scripts/enable-confirmation-automation.ts --slug=<slug>
 */
import { findBarbershopBySlug } from "../repositories/barbershops.js";
import { updateAgendaSettings } from "../repositories/agenda-settings.js";

function parseArgs(argv: string[]) {
  const get = (flag: string): string | undefined => {
    const found = argv.find((a) => a.startsWith(`--${flag}=`));
    return found ? found.slice(flag.length + 3) : undefined;
  };
  return { slug: get("slug") };
}

async function main() {
  const { slug } = parseArgs(process.argv.slice(2));

  if (!slug) {
    console.error("Uso: tsx src/scripts/enable-confirmation-automation.ts --slug=<slug>");
    process.exit(1);
  }

  const barbershop = await findBarbershopBySlug(slug);
  if (!barbershop) {
    console.error(`Barbearia não encontrada para o slug "${slug}".`);
    process.exit(1);
  }

  if (!barbershop.whatsappPhoneNumberId) {
    console.error(
      `Barbearia "${barbershop.name}" (${barbershop.id}) ainda não tem whatsappPhoneNumberId configurado. ` +
        "Configure o número (onboarding do canal WhatsApp) antes de ligar a confirmação automática.",
    );
    process.exit(1);
  }

  await updateAgendaSettings(barbershop.id, { confirmationAutomationEnabled: true });
  console.log(
    `Confirmação automática LIGADA para "${barbershop.name}" (${barbershop.id}), número ${barbershop.whatsappPhoneNumberId}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
