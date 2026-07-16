import { deleteException } from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireOwnerSessionApi } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string; exId: string }>;
}

/** Dono-only (matriz de autorização do design.md). */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { exId } = await params;
  const removed = await deleteException(auth.barbershopId, exId);
  if (!removed) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
