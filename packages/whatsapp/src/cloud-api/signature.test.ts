import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyCloudApiSignature } from "./signature";

const APP_SECRET = "segredo-de-teste";

function sign(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

describe("verifyCloudApiSignature", () => {
  it("aceita assinatura válida calculada sobre o corpo cru", () => {
    const body = JSON.stringify({ entry: [{ id: "1" }] });
    const header = sign(body, APP_SECRET);
    expect(verifyCloudApiSignature(body, header, APP_SECRET)).toBe(true);
  });

  it("recusa quando o segredo usado para assinar é diferente", () => {
    const body = JSON.stringify({ entry: [{ id: "1" }] });
    const header = sign(body, "outro-segredo");
    expect(verifyCloudApiSignature(body, header, APP_SECRET)).toBe(false);
  });

  it("recusa quando o corpo foi alterado após a assinatura (ex.: re-serialização)", () => {
    const originalBody = '{"a":1,"b":2}';
    const header = sign(originalBody, APP_SECRET);
    const reserializedBody = JSON.stringify(JSON.parse(originalBody)); // pode reordenar chaves
    // Mesmo que o conteúdo "pareça" igual, qualquer diferença de bytes deve invalidar —
    // aqui forçamos uma diferença real de bytes para provar a checagem.
    const tamperedBody = `${originalBody} `;
    expect(verifyCloudApiSignature(tamperedBody, header, APP_SECRET)).toBe(false);
    // A re-serialização sem diferença de bytes continua válida — o ponto crítico é que
    // qualquer BYTE diferente (o caso acima) já quebra.
    expect(reserializedBody).toBe(originalBody);
  });

  it("recusa sem header de assinatura", () => {
    expect(verifyCloudApiSignature("{}", null, APP_SECRET)).toBe(false);
  });

  it("recusa header em formato inesperado", () => {
    expect(verifyCloudApiSignature("{}", "not-a-valid-header", APP_SECRET)).toBe(false);
  });
});
