// small form fields for the properties panel
import type { ReactNode } from "react";
import { hexToRgb, rgbToHex, type Rgb } from "../sky";
import { shownNumber } from "../shownNumber";
import "./Fields.css";

// a field: its label beside what's in it, or over it if stacked (a slider, whose label can be long)
export function Field({ label, stacked = false, children }: { label: string; stacked?: boolean; children: ReactNode }) {
  return (
    <label className={fieldClass(stacked)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function fieldClass(stacked: boolean): string {
  if (stacked) {
    return "field stacked";
  }
  return "field";
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
      <input type="number" value={shownNumber(value)} step={step} min={min} onChange={(event) => change(event.target)} />
    </Field>
  );
}

// a slider, in steps of step (whole numbers unless given); onGrab runs as it's pressed or keyed, before it changes
export function SliderField({ label, value, min, max, step = 1, onGrab, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onGrab: () => void; onChange: (value: number) => void;
}) {
  return (
    <Field label={`${label} (${value})`} stacked>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
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

// a tick box, greyed out and unchangeable if disabled
export function CheckboxField({ label, checked, disabled = false, onChange }: {
  label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void;
}) {
  return (
    <Field label={label}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </Field>
  );
}

// a choice's name as a dropdown shows it, its first _ a space
const spacedName = (choice: string) => choice.replace("_", " ");

// a dropdown of choices, each shown as labelOf names it (its name, spaced, without)
export function ChoiceField<Choice extends string>({ label, value, choices, onChange, labelOf = spacedName }: {
  label: string; value: Choice; choices: readonly Choice[]; onChange: (value: Choice) => void; labelOf?: (choice: Choice) => string;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value as Choice)}>
        {choices.map((choice) => <option key={choice} value={choice}>{labelOf(choice)}</option>)}
      </select>
    </Field>
  );
}
