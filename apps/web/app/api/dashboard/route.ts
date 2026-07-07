import { getDashboard } from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";

export async function GET() {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const dashboard = await getDashboard(auth.barbershopId);
  return NextResponse.json(dashboard);
}
