import { useCallback, useState } from "react";
import type { LevelInfo } from "./api";
import LevelMesh from "./components/LevelMesh";
import LevelPicker from "./components/LevelPicker";
import ObjectMarkers from "./components/ObjectMarkers";
import Scene from "./components/Scene";
import { useLevelGroup } from "./hooks/useLevelGroup";
import { useLevelObjects } from "./hooks/useLevelObjects";
import { useLevels } from "./hooks/useLevels";

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const showError = useCallback((message: string) => setError(message), []);
  const { levels, level, open } = useLevels(showError);
  const group = useLevelGroup(level, showError);
  const objects = useLevelObjects(level, showError);

  const openLevel = (name: string) => {
    setError(null);
    open(name);
  };

  const renderHeader = () => (
    <header className="toolbar">
      <LevelPicker levels={levels} level={level} onOpen={openLevel} />
      {error && <span className="error">{error}</span>}
    </header>
  );

  const renderLevel = (shownLevel: LevelInfo) => (
    <>
      {group && <LevelMesh group={group} />}
      <ObjectMarkers objects={objects} scale={shownLevel.scale} />
    </>
  );

  const renderMain = () => (
    <main className="viewport">
      <Scene>{level && renderLevel(level)}</Scene>
    </main>
  );

  return (
    <div className="app">
      {renderHeader()}
      {renderMain()}
    </div>
  );
}
