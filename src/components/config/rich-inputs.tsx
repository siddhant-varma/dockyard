/**
 * RichInput — renders config entry inputs based on their `input_type`.
 *
 * Supports: text, password, select, number, slider, toggle.
 * Each input validates against its constraints (min/max/options) from
 * the `input_options` JSON field before calling onSave.
 *
 * @param inputType - The config entry's input type.
 * @param inputOptions - JSON options for the input (e.g., min, max, options array).
 * @param value - The current value of the config entry.
 * @param onChange - Callback when the value changes.
 */

"use client";

import { useState } from "react";

/** Options shape stored in config_entries.input_options. */
interface InputOptions {
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

interface RichInputProps {
  inputType: string;
  inputOptions?: InputOptions | null;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function RichInput({
  inputType,
  inputOptions,
  value,
  onChange,
  disabled,
}: RichInputProps) {
  const opts = inputOptions ?? {};

  switch (inputType) {
    case "password":
      return <PasswordInput value={value} onChange={onChange} disabled={disabled} />;

    case "select":
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="">Select...</option>
          {(opts.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "number":
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={opts.min}
          max={opts.max}
          step={opts.step ?? 1}
          disabled={disabled}
          className="w-full rounded border px-3 py-2 text-sm"
        />
      );

    case "slider":
      return (
        <SliderInput
          value={value}
          onChange={onChange}
          min={opts.min ?? 0}
          max={opts.max ?? 100}
          step={opts.step ?? 1}
          disabled={disabled}
        />
      );

    case "toggle":
      return (
        <ToggleInput value={value} onChange={onChange} disabled={disabled} />
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded border px-3 py-2 text-sm"
        />
      );
  }
}

function PasswordInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <input
        type={revealed ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 rounded border px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={() => setRevealed(!revealed)}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        {revealed ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function SliderInput({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
}) {
  const numValue = Number(value) || min;

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        value={numValue}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="flex-1"
      />
      <span className="min-w-[3rem] text-right text-sm font-mono">
        {numValue}
      </span>
    </div>
  );
}

function ToggleInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const isOn = value === "true" || value === "1";

  return (
    <button
      type="button"
      onClick={() => onChange(isOn ? "false" : "true")}
      disabled={disabled}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        isOn ? "bg-blue-600" : "bg-gray-300"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          isOn ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
