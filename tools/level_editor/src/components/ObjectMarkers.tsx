import type { LevelObject } from "../objects";
import ObjectMarker from "./ObjectMarker";

export default function ObjectMarkers({ objects, scale }: { objects: LevelObject[]; scale: number }) {
  return (
    <>
      {objects.map((object, i) => (
        <ObjectMarker key={i} object={object} scale={scale} selected={false} warning={false} />
      ))}
    </>
  );
}
