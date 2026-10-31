import { useCallback, useState } from "react";
import type { LevelInfo } from "./api";
import LevelMesh from "./components/LevelMesh";
import LevelPicker from "./components/LevelPicker";
import ObjectMarkers from "./components/ObjectMarkers";
import Scene from "./components/Scene";
import { useLevelGroup } from "./hooks/useLevelGroup";
import { useLevelObjects } from "./hooks/useLevelObjects";
import { useLevels } from "./hooks/useLevels";

function LevelView({ level, onError }: { level: LevelInfo; onError: (message: string) => void }) {
  const group = useLevelGroup(level, onError);
  const objects = useLevelObjects(level, onError);
  return (
    <>
      {group && <LevelMesh group={group} />}
      <ObjectMarkers objects={objects} scale={level.scale} />
    </>
  );
}

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const showError = useCallback((message: string) => setError(message), []);
  const { levels, level, open } = useLevels(showError);

  return (
    <div className="app">
      <header className="toolbar">
        <LevelPicker levels={levels} level={level} onOpen={(name) => { setError(null); open(name); }} />
        {error && <span className="error">{error}</span>}
      </header>
      <main className="viewport">
        <Scene>{level && <LevelView key={level.name} level={level} onError={showError} />}</Scene>
      </main>
    </div>
  );
}
