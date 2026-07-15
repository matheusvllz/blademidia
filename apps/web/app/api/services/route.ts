import { createService, listServices } from "@blademidia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi } from "@/lib/auth";
import { parseBody } from "@/lib/api";

export async function GET() {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const services = await listServices(auth.barbershopId);
  return NextResponse.json({ services });
}

const createSchema = z.object({
  name: z.string().min(1),
  durationMin: z.number().int().positive(),
  priceCents: z.number().int().nonnegative().nullish(),
});

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { data, response } = await parseBody(request, createSchema);
  if (response) return response;

  const result = await createService(auth.barbershopId, data);
  if (result.error === "invalid_duration") {
    return NextResponse.json({ error: "duração inválida" }, { status: 400 });
  }
  if (result.error === "missing_fields") {
    return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  }
  return NextResponse.json({ service: result.service }, { status: 201 });
}
