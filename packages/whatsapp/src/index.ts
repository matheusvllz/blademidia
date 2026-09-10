/**
 * @blademidia/whatsapp — canal WhatsApp do produto (ADR-0004, ADR-0011).
 * Único ponto de entrada; nada fora deste pacote conhece formato de provedor.
 */
export * from "./types";
export * from "./constants";
export * from "./provider";
export * from "./phone";
export * from "./dry-run";
export * from "./config";
export * from "./cloud-api/adapter";
export * from "./cloud-api/signature";
export * from "./cloud-api/normalize";
