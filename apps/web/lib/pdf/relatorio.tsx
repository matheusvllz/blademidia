import type { ReportData } from "@blademidia/core";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/**
 * Resumo apresentável do período (spec "Resumo apresentável e exportação em
 * PDF"). Gerado com `@react-pdf/renderer` — JS puro, sem headless browser
 * (Decision 3 do design.md, orçamento D4). Paleta Blade replicada em hex
 * (o sistema de estilo do react-pdf não reaproveita as classes Tailwind).
 */

const INK = "#0D0D0D";
const GOLD = "#C9A84C";
const STEEL = "#2B2B2B";
const WIRE = "#8C8C8C";
const CHALK = "#F5F2EC";

const styles = StyleSheet.create({
  page: { padding: 32, backgroundColor: "#FFFFFF", fontSize: 11, color: INK },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    borderBottomStyle: "solid",
    paddingBottom: 10,
  },
  brand: { fontSize: 18, fontWeight: 700, color: INK },
  brandDot: { color: GOLD },
  subtitle: { fontSize: 10, color: WIRE, marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: INK,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  card: { width: "23%", backgroundColor: CHALK, padding: 8, borderRadius: 4, marginRight: 10, marginBottom: 10 },
  cardLabel: { fontSize: 8, color: WIRE, textTransform: "uppercase", marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: 700, color: INK },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: CHALK,
    borderBottomStyle: "solid",
  },
  rowLabel: { color: STEEL },
  rowValue: { color: WIRE, fontSize: 9 },
  empty: { fontSize: 10, color: WIRE, fontStyle: "italic" },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: WIRE, textAlign: "center" },
});

function formatMoney(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface ReportPdfDocumentProps {
  data: ReportData;
  barbershopName: string;
}

export function ReportPdfDocument({ data, barbershopName }: ReportPdfDocumentProps) {
  const isEmptyRevenue = data.visitsCount === 0;
  const hasCapacity = data.capacity > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            BLADE<Text style={styles.brandDot}>.</Text>MÍDIA
          </Text>
          <Text style={styles.subtitle}>
            Relatório de {barbershopName} — {data.period.from} a {data.period.to}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores</Text>
          {isEmptyRevenue ? (
            <Text style={styles.empty}>
              Nenhum atendimento ou pagamento registrado neste período.
            </Text>
          ) : (
            <View style={styles.grid}>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Faturamento</Text>
                <Text style={styles.cardValue}>{formatMoney(data.revenueCents)}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Atendimentos</Text>
                <Text style={styles.cardValue}>{data.visitsCount}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Ticket médio</Text>
                <Text style={styles.cardValue}>{formatMoney(data.avgTicketCents)}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Novos / atendidos</Text>
                <Text style={styles.cardValue}>
                  {data.newClientsCount}/{data.servedClientsCount}
                </Text>
              </View>
            </View>
          )}
          {data.unpricedVisitsCount > 0 && (
            <Text style={styles.empty}>
              {data.unpricedVisitsCount} atendimento(s) sem valor informado — não entram no
              faturamento nem no ticket médio acima.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agenda</Text>
          {!hasCapacity ? (
            <Text style={styles.empty}>
              Sem grade de trabalho configurada neste período — ocupação indisponível.
            </Text>
          ) : (
            <View style={styles.grid}>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Ocupação</Text>
                <Text style={styles.cardValue}>
                  {data.occupied}/{data.capacity}
                </Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Faltas</Text>
                <Text style={styles.cardValue}>{data.noShowCount}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Cancelamentos</Text>
                <Text style={styles.cardValue}>{data.canceledCount}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serviços mais realizados</Text>
          {data.topServices.length === 0 ? (
            <Text style={styles.empty}>Nenhum atendimento no período.</Text>
          ) : (
            data.topServices.map((service) => (
              <View key={`${service.serviceId ?? "sem-catalogo"}-${service.name}`} style={styles.row}>
                <Text style={styles.rowLabel}>{service.name}</Text>
                <Text style={styles.rowValue}>
                  {service.visitsCount} atendimento(s) · {formatMoney(service.revenueCents)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produção por barbeiro</Text>
          {data.topBarbers.length === 0 ? (
            <Text style={styles.empty}>Nenhum atendimento no período.</Text>
          ) : (
            data.topBarbers.map((barber) => (
              <View key={`${barber.barberId ?? "sem-barbeiro"}-${barber.name}`} style={styles.row}>
                <Text style={styles.rowLabel}>{barber.name}</Text>
                <Text style={styles.rowValue}>
                  {barber.visitsCount} atendimento(s) · {formatMoney(barber.revenueCents)}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer} fixed>
          Blade Mídia — relatório gerado automaticamente, sem envio ou processamento de pagamento.
        </Text>
      </Page>
    </Document>
  );
}
