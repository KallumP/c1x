// small form fields for the properties panel
import type { ReactNode } from "react";
import { hexToRgb, rgbToHex, type Rgb } from "../sky";
import "./Fields.css";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function NumberField({ label, value, step, min, onChange }: {
  label: string; value: number; step: number; min?: number; onChange: (value: number) => void;
}) {
  // an empty or half-typed number (such as "-") isn't passed on, so the field can be typed into
  const change = (input: HTMLInputElement) => {
    if (input.value !== "" && !Number.isNaN(input.valueAsNumber)) {
      onChange(input.valueAsNumber);
    }
  };

  return (
    <Field label={label}>
      <input type="number" value={value} step={step} min={min} onChange={(event) => change(event.target)} />
    </Field>
  );
}

// a slider for a whole number; onGrab runs as it's pressed or keyed, before it changes
export function SliderField({ label, value, min, max, onGrab, onChange }: {
  label: string; value: number; min: number; max: number; onGrab: () => void; onChange: (value: number) => void;
}) {
  return (
    <Field label={`${label} (${value})`}>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={1}
        onPointerDown={onGrab}
        onKeyDown={onGrab}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </Field>
  );
}

export function ColourField({ label, value, onChange }: {
  label: string; value: Rgb; onChange: (value: Rgb) => void;
}) {
  return (
    <Field label={label}>
      <input type="color" value={rgbToHex(value)} onChange={(event) => onChange(hexToRgb(event.target.value))} />
    </Field>
  );
}

export function ChoiceField<Choice extends string>({ label, value, choices, onChange }: {
  label: string; value: Choice; choices: readonly Choice[]; onChange: (value: Choice) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value as Choice)}>
        {choices.map((choice) => <option key={choice} value={choice}>{choice.replace("_", " ")}</option>)}
      </select>
    </Field>
  );
}
