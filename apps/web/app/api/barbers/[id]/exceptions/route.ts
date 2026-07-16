import { createException, getBarber, listExceptionsForBarber } from "@blademidia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerSessionApi, requireSessionApi } from "@/lib/auth";
import { parseBody } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = url.searchParams.get("to") ?? from;
  const exceptions = await listExceptionsForBarber(auth.barbershopId, id, from, to);
  return NextResponse.json({ exceptions });
}

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);
const postSchema = z.object({
  date: z.string().regex(dateRe, "data deve ser YYYY-MM-DD"),
  kind: z.enum(["folga", "bloqueio", "extra"]),
  startTime: time.nullish(),
  endTime: time.nullish(),
  reason: z.string().nullish(),
});

/** Dono-only (matriz de autorização do design.md). */
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const barber = await getBarber(auth.barbershopId, id);
  if (!barber) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const { data, response } = await parseBody(request, postSchema);
  if (response) return response;

  const result = await createException(auth.barbershopId, {
    barberId: id,
    date: data.date,
    kind: data.kind,
    startTime: data.startTime ?? null,
    endTime: data.endTime ?? null,
    reason: data.reason ?? null,
  });
  if (result.error === "missing_window") {
    return NextResponse.json(
      { error: "bloqueio e disponibilidade extra exigem horário de início e fim" },
      { status: 400 },
    );
  }
  return NextResponse.json({ exception: result.exception }, { status: 201 });
}
