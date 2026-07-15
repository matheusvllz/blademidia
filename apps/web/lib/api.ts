import type { AgendaError } from "@blademidia/core";
import { NextResponse } from "next/server";
import { z } from "zod";

/** Mapeia os erros de domínio da agenda para status HTTP (ver design.md). */
export function agendaErrorResponse(reason: AgendaError): NextResponse {
  const map: Record<AgendaError, { status: number; message: string }> = {
    not_found: { status: 404, message: "não encontrado" },
    not_available: { status: 409, message: "horário indisponível" },
    in_past: { status: 409, message: "horário no passado" },
    conflict: { status: 409, message: "esse horário acabou de ser ocupado" },
    invalid_transition: { status: 409, message: "operação inválida para o estado atual" },
  };
  const { status, message } = map[reason];
  return NextResponse.json({ error: message, reason }, { status });
}

/**
 * Lê e valida o corpo JSON com um schema Zod. Devolve `{ data }` ou uma resposta
 * 400 pronta em `{ response }`.
 */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T; response: null } | { data: null; response: NextResponse }> {
  const raw = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const message = first ? `${first.path.join(".")}: ${first.message}` : "entrada inválida";
    return { data: null, response: NextResponse.json({ error: message }, { status: 400 }) };
  }
  return { data: parsed.data, response: null };
}
