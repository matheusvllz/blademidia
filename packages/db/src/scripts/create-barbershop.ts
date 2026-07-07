/**
 * Cria uma barbearia + o primeiro usuário (dono) — não existe onboarding
 * self-service na Fase 1 (`project.md`, fora de escopo v1); isto é o comando
 * que Vítor/Matheus rodam ao dar acesso a um cliente novo.
 *
 * Uso:
 *   tsx src/scripts/create-barbershop.ts --slug=<slug> --name="<nome>" \
 *     --login=<email-ou-telefone> --password=<senha>
 */
import { createBarbershop } from "../repositories/barbershops.js";
import { createUser } from "../repositories/users.js";

function parseArgs(argv: string[]) {
  const get = (flag: string): string | undefined => {
    const found = argv.find((a) => a.startsWith(`--${flag}=`));
    return found ? found.slice(flag.length + 3) : undefined;
  };
  return {
    slug: get("slug"),
    name: get("name"),
    login: get("login"),
    password: get("password"),
  };
}

async function main() {
  const { slug, name, login, password } = parseArgs(process.argv.slice(2));

  if (!slug || !name || !login || !password) {
    console.error(
      'Uso: tsx src/scripts/create-barbershop.ts --slug=<slug> --name="<nome>" ' +
        "--login=<email-ou-telefone> --password=<senha>",
    );
    process.exit(1);
  }

  const barbershop = await createBarbershop(slug, name);
  await createUser(barbershop.id, login, password);

  console.log(`Barbearia criada: ${barbershop.name} (${barbershop.id})`);
  console.log(`Login: ${login}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
