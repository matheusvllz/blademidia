import { describe, expect, it } from "vitest";
import { alternateBrazilianPhoneForms, normalizePhoneToE164, phoneCandidates } from "./phone";

describe("normalizePhoneToE164", () => {
  it("normaliza número local com DDI já presente", () => {
    expect(normalizePhoneToE164("5511998765432")).toBe("+5511998765432");
  });

  it("normaliza número local sem DDI, com o nono dígito", () => {
    expect(normalizePhoneToE164("11998765432")).toBe("+5511998765432");
  });

  it("normaliza número local sem DDI, sem o nono dígito (fixo/antigo)", () => {
    expect(normalizePhoneToE164("1133224455")).toBe("+551133224455");
  });

  it("aceita o número já formatado com símbolos", () => {
    expect(normalizePhoneToE164("+55 (11) 99876-5432")).toBe("+5511998765432");
  });
});

describe("alternateBrazilianPhoneForms", () => {
  it("gera a forma sem o nono dígito quando o número tem 9 dígitos locais", () => {
    expect(alternateBrazilianPhoneForms("+5511998765432")).toEqual(["+551198765432"]);
  });

  it("gera a forma com o nono dígito quando o número tem 8 dígitos locais", () => {
    expect(alternateBrazilianPhoneForms("+551198765432")).toEqual(["+5511998765432"]);
  });

  it("não gera alternativa para número fora do Brasil", () => {
    expect(alternateBrazilianPhoneForms("+12025550123")).toEqual([]);
  });
});

describe("phoneCandidates", () => {
  it("inclui a forma normalizada e a alternativa do nono dígito", () => {
    expect(phoneCandidates("11998765432")).toEqual(["+5511998765432", "+551198765432"]);
  });
});
