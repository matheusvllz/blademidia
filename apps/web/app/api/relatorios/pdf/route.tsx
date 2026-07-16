import { aggregateReport } from "@blademidia/core";
import { getBarbershop } from "@blademidia/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { requireOwnerSessionApi } from "@/lib/auth";
import { ReportPdfDocument } from "@/lib/pdf/relatorio";

/**
 * `GET /api/relatorios/pdf?from=&to=` — resumo do período em PDF (spec
 * "Resumo apresentável e exportação em PDF"). Dono-only (Fase 4, matriz de
 * autorização do design.md).
 */
export async function GET(request: Request) {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "informe from e to" }, { status: 400 });
  }

  const [result, shop] = await Promise.all([
    aggregateReport(auth.barbershopId, { from, to }),
    getBarbershop(auth.barbershopId),
  ]);
  if (!result.ok) {
    return NextResponse.json({ error: "intervalo inválido: from deve ser <= to" }, { status: 400 });
  }

  const buffer = await renderToBuffer(
    <ReportPdfDocument data={result.value} barbershopName={shop?.name ?? "Barbearia"} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${from}-a-${to}.pdf"`,
    },
  });
}
