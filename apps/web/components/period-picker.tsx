"use client";

import type { ReportPreset } from "@blademidia/core";
import { useState } from "react";

const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: "mes_atual", label: "Mês atual" },
  { value: "mes_passado", label: "Mês passado" },
  { value: "semana", label: "Últimos 7 dias" },
  { value: "trimestre", label: "Trimestre" },
];

interface PeriodPickerProps {
  activePreset: ReportPreset | null;
  fromValue: string;
  toValue: string;
  onSelectPreset: (preset: ReportPreset) => void;
  onSelectCustomRange: (from: string, to: string) => void;
}

export function PeriodPicker({
  activePreset,
  fromValue,
  toValue,
  onSelectPreset,
  onSelectCustomRange,
}: PeriodPickerProps) {
  const [from, setFrom] = useState(fromValue);
  const [to, setTo] = useState(toValue);
  const [rangeError, setRangeError] = useState<string | null>(null);

  function handleApplyRange() {
    if (!from || !to) {
      setRangeError("informe as duas datas");
      return;
    }
    if (from > to) {
      setRangeError("a data inicial deve ser anterior ou igual à final");
      return;
    }
    setRangeError(null);
    onSelectCustomRange(from, to);
  }

  return (
    <div className="card-blade mb-6 space-y-3">
      <p className="label-blade">Período</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onSelectPreset(preset.value)}
            className={
              activePreset === preset.value
                ? "btn-gold"
                : "btn-secondary"
            }
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2 border-t border-steel/10 pt-3">
        <div>
          <label className="label-blade mb-1 block" htmlFor="period-from">
            De
          </label>
          <input
            id="period-from"
            type="date"
            className="input-blade"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label-blade mb-1 block" htmlFor="period-to">
            Até
          </label>
          <input
            id="period-to"
            type="date"
            className="input-blade"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button type="button" onClick={handleApplyRange} className="btn-secondary">
          Aplicar intervalo
        </button>
      </div>
      {rangeError && <p className="text-sm text-alert-red">{rangeError}</p>}
    </div>
  );
}
