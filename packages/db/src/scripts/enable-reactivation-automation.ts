/**
 * Liga `reactivationAutomationEnabled` para uma barbearia — mesmo padrão de
 * `enable-confirmation-automation.ts` (change `add-confirmacao-agendamento`): ativação é
 * operação interna do Matheus, não self-service. Valida que a barbearia já tem
 * `whatsappPhoneNumberId` configurado antes de ligar.
 *
 * **Antes de rodar, confirmar (plano de execução da Fase 5 § 9):**
 * (1) template de reativação (categoria MARKETING) aprovado pela Meta para esta barbearia;
 * (2) conta de custo feita contra a base real de clientes inativos desta barbearia — não é
 * validação automática, é responsabilidade de quem roda o script.
 *
 * Uso:
 *   tsx src/scripts/enable-reactivation-automation.ts --slug=<slug> [--daily-cap=<n>]
 */
import { findBarbershopBySlug } from "../repositories/barbershops.js";
import { setReactivationSettings } from "../repositories/settings.js";

function parseArgs(argv: string[]) {
  const get = (flag: string): string | undefined => {
    const found = argv.find((a) => a.startsWith(`--${flag}=`));
    return found ? found.slice(flag.length + 3) : undefined;
  };
  return { slug: get("slug"), dailyCap: get("daily-cap") };
}

async function main() {
  const { slug, dailyCap } = parseArgs(process.argv.slice(2));

  if (!slug) {
    console.error(
      "Uso: tsx src/scripts/enable-reactivation-automation.ts --slug=<slug> [--daily-cap=<n>]",
    );
    process.exit(1);
  }

  const parsedCap = dailyCap !== undefined ? Number(dailyCap) : undefined;
  if (parsedCap !== undefined && (!Number.isInteger(parsedCap) || parsedCap < 1)) {
    console.error(`--daily-cap precisa ser um inteiro positivo (recebido: "${dailyCap}").`);
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
        "Configure o número (onboarding do canal WhatsApp) antes de ligar a reativação automática.",
    );
    process.exit(1);
  }

  await setReactivationSettings(barbershop.id, {
    reactivationAutomationEnabled: true,
    ...(parsedCap !== undefined ? { reactivationDailyCap: parsedCap } : {}),
  });

  console.log(
    `Reativação automática LIGADA para "${barbershop.name}" (${barbershop.id}), número ${barbershop.whatsappPhoneNumberId}` +
      (parsedCap !== undefined ? `, limite diário ${parsedCap}.` : ", limite diário padrão."),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
