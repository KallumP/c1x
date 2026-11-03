// small form fields for the properties panel
import type { ReactNode } from "react";
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
