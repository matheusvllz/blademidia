import { completeAppointment } from "@blademidia/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi } from "@/lib/auth";
import { agendaErrorResponse, parseBody } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const schema = z.object({
  amountCents: z.number().int().nonnegative().nullish(),
  method: z.enum(["dinheiro", "cartao", "pix", "outro"]).optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const { data, response } = await parseBody(request, schema);
  if (response) return response;

  const result = await completeAppointment(auth.barbershopId, id, {
    amountCents: data.amountCents ?? null,
    method: data.method,
  });
  if (!result.ok) return agendaErrorResponse(result.reason);
  return NextResponse.json(result.value);
}
