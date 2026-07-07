import { createClient, listClients } from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";

export async function GET() {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const clients = await listClients(auth.barbershopId);
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);

  const name = body?.name?.trim();
  const phone = body?.phone?.trim();
  if (!name || !phone) {
    return NextResponse.json({ error: "nome e telefone são obrigatórios" }, { status: 400 });
  }

  const result = await createClient(auth.barbershopId, { name, phone, notes: body?.notes });

  if (result.error === "phone_duplicate") {
    return NextResponse.json(
      { error: "já existe um cliente com esse telefone", client: result.client },
      { status: 409 },
    );
  }
  if (result.error === "missing_fields") {
    return NextResponse.json({ error: "nome e telefone são obrigatórios" }, { status: 400 });
  }

  return NextResponse.json({ client: result.client }, { status: 201 });
}
