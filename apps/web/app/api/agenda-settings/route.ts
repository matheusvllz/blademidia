import { getAgendaSettings, updateAgendaSettings } from "@blademidia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi } from "@/lib/auth";
import { parseBody } from "@/lib/api";

export async function GET() {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const settings = await getAgendaSettings(auth.barbershopId);
  return NextResponse.json({ settings });
}

const patchSchema = z
  .object({
    slotStepMin: z.number().int().min(5).max(240).optional(),
    minAdvanceMin: z.number().int().min(0).max(60 * 24 * 30).optional(),
    noShowAfterMin: z.number().int().min(0).max(60 * 24).optional(),
    confirmationLeadHours: z.number().int().min(0).max(240).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "nada para atualizar" });

export async function PATCH(request: Request) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { data, response } = await parseBody(request, patchSchema);
  if (response) return response;
  const settings = await updateAgendaSettings(auth.barbershopId, data);
  return NextResponse.json({ settings });
}
