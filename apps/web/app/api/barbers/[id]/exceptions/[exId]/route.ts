import { deleteException } from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string; exId: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { exId } = await params;
  const removed = await deleteException(auth.barbershopId, exId);
  if (!removed) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
