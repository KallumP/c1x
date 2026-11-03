import type { LevelInfo } from "../api";

export default function LevelPicker({ levels, level, onOpen }: {
  levels: LevelInfo[];
  level: LevelInfo | null;
  onOpen: (name: string) => void;
}) {
  return (
    <label>
      Level{" "}
      <select value={level?.name ?? ""} onChange={(e) => onOpen(e.target.value)}>
        {levels.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}
      </select>
    </label>
  );
}
