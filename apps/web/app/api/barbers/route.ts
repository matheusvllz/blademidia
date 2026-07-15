import { createBarber, listBarbers } from "@blademidia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi } from "@/lib/auth";
import { parseBody } from "@/lib/api";

export async function GET() {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const barbers = await listBarbers(auth.barbershopId);
  return NextResponse.json({ barbers });
}

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().nullish(),
});

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { data, response } = await parseBody(request, createSchema);
  if (response) return response;
  const result = await createBarber(auth.barbershopId, data);
  if (result.error === "missing_fields") {
    return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  }
  return NextResponse.json({ barber: result.barber }, { status: 201 });
}
