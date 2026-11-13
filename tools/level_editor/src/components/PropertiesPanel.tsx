// the selected object's settings, or the level's (its level.cfg) with nothing selected
import { useEffect, useRef, useState } from "react";
import type { LevelCfg, LevelSong } from "../api";
import type { EditorAction, EditorState } from "../editor";
import { useShiftHeld } from "../hooks/useShiftHeld";
import { enemyPath, inNodes, nodeCount, nodeHeading, nodeTurnedRound, pathPositions, turnedRound, withNodeAt } from "../enemyPaths";
import { BOX_TYPES, boxTypeName, hasNodes, hasNumberSetting, hasPath, NUMBER_SETTING_RULES, NUMBER_SETTINGS, numberSetting, settingMax, PATH_NODES_MAX, ROTATING_OBSTACLES, type BoxType, type LevelObject, type NumberSetting, type ObjectType, type ObstacleType, type Vec3, objectType } from "../objects";
import { dropToFloor, type Triangle } from "../overlaps";
import { CAMERA_ANGLE_MAX, CAMERA_ANGLE_MIN, CAMERA_DISTANCE_MAX, CAMERA_DISTANCE_MIN, type Camera } from "../camera";
import { SKY_ROWS, type Sky } from "../sky";
import { SOUNDTRACKS, soundtrack } from "../music";
import { ChoiceField, ColourField, NumberField, SliderField } from "./Fields";
import "./PropertiesPanel.css";

const AXES = ["x", "y"] as const;
// each number setting's slider: its label, and its steps (a stone's start of
// its track, a speed times the game's own pace, a count of badgers, a bat
// roost's seconds between flocks, a gunman's range in metres, a mossy slide's
// length in metres, angle in degrees and rotation in degrees, and a spiked
// log's seconds between its pushes and seconds they're put off by)
// a number setting's slider for an object: a sliding pillar's or carrying
// platform's speed is in metres a second, and a rotating obstacle's every is the time a turn takes
// and its offset how far round its turn it starts, as a rising pillar's are
// the time a rise and fall takes and how far into it it starts
const METRES_A_SECOND: ObstacleType[] = ["sliding_pillar", "carrying_platform", "moving_platform", "lift_platform"];
function numberSlider(object: LevelObject, setting: NumberSetting): { label: string; step: number } {
  if (setting === "speed" && METRES_A_SECOND.includes(object.obstacle!)) {
    return { label: "speed m/s", step: 0.05 };
  }
  if (setting === "delay" && object.obstacle === "timed_plank") {
    return { label: "break delay s", step: 0.5 };
  }
  if (setting === "every" && ROTATING_OBSTACLES.includes(object.obstacle!)) {
    return { label: "turn time s", step: 0.5 };
  }
  if (setting === "offset" && ROTATING_OBSTACLES.includes(object.obstacle!)) {
    return { label: "rotation start offset s", step: 0.5 };
  }
  if (setting === "every" && object.obstacle === "rising_pillar") {
    return { label: "rise and fall time s", step: 0.5 };
  }
  if (setting === "offset" && object.obstacle === "rising_pillar") {
    return { label: "rise start offset s", step: 0.5 };
  }
  return NUMBER_SLIDERS[setting];
}

const NUMBER_SLIDERS: Record<NumberSetting, { label: string; step: number }> = {
  speed: { label: "speed ×", step: 0.25 },
  start: { label: "start", step: 0.05 },
  count: { label: "count", step: 1 },
  delay: { label: "delay s", step: 0.5 },
  range: { label: "range m", step: 1 },
  length: { label: "length m", step: 0.5 },
  angle: { label: "angle °", step: 1 },
  rotation: { label: "rotation °", step: 5 },
  every: { label: "every s", step: 0.5 },
  offset: { label: "offset s", step: 0.5 },
  platforms: { label: "platforms", step: 1 },
  radius: { label: "radius m", step: 0.5 },
  shake: { label: "shake before dropping s", step: 0.25 },
  down: { label: "time dropped s", step: 0.5 },
};
const NODE_AXES = ["x", "y", "z"] as const; // a path node can go anywhere, up and down too // z is the floor's height under the object, set by placing, dragging and Drop to floor
// the enemies reversed across the map, and what their Reverse direction button does
const ACROSS_REVERSE_TITLES: Partial<Record<ObjectType, string>> = {
  fish: "It leaps from the solid fish to the faded one, and back",
};
const TURNS = ["0", "90", "180", "270"] as const; // degrees, the turns the build does

export default function PropertiesPanel({ state, warnings, pathWarnings, scale, triangles, dispatch, levelCfg, onLevelCfg, song }: {
  state: EditorState;
  warnings: Set<number>;
  pathWarnings: Set<number>; // the path enemies whose paths leave the floor or run through a wall
  scale: number;
  triangles: Triangle[]; // the level's, for dropping a box to the floor
  dispatch: (action: EditorAction) => void;
  levelCfg: LevelCfg | null; // null with no level open
  onLevelCfg: (changes: Partial<LevelCfg>) => void;
  song: LevelSong | null; // which of its own song's files the open level has
}) {
  const isShiftHeld = useShiftHeld();
  const index = state.selected;
  const object = index === null ? null : state.objects[index];
  const [hasNoFloor, setHasNoFloor] = useState(false); // the last drop found no floor below the box
  useEffect(() => setHasNoFloor(false), [object]);
  const grabbedPath = useRef<Vec3[] | null>(null); // the path as it was when its node slider was grabbed

  const change = (changes: Partial<LevelObject>) => {
    if (index !== null) {
      dispatch({ type: "update", index, changes });
    }
  };

  const renderPositionFields = (at: Vec3) => {
    const setAxis = (axis: number, value: number) => {
      change({ at: at.map((current, axisIndex) => (axisIndex === axis ? value : current)) as Vec3 });
    };
    // holding shift makes the arrows step in finer steps
    const step = isShiftHeld ? 0.01 : 0.1;
    return AXES.map((axis, axisIndex) => (
      <NumberField
        key={axis}
        label={axis}
        value={at[axisIndex]}
        step={step}
        onChange={(value) => setAxis(axisIndex, value)}
      />
    ));
  };

  const renderBoxFields = (box: LevelObject) => (
    <>
      <ChoiceField
        label="type"
        value={boxTypeName(box.box!)}
        choices={Object.keys(BOX_TYPES) as BoxType[]}
        onChange={(boxType) => change({ box: boxType })}
      />
      <NumberField
        label="stack"
        value={box.stack}
        step={1}
        min={1}
        onChange={(stack) => change({ stack: Math.max(1, Math.round(stack)) })}
      />
    </>
  );

  // the selected node of a path enemy's path, or leader bats' second leader: where it is in blender
  const renderNodeFields = (enemy: LevelObject, node: number) => {
    const turn = levelCfg ? levelCfg.turn : 0;
    const position = pathPositions(enemy, turn, scale)[node];
    const setAxis = (axis: number, value: number) => {
      const moved = position.map((current, axisIndex) => (axisIndex === axis ? value : current)) as Vec3;
      change({ path: withNodeAt(enemy, node, moved, turn, scale) });
    };
    const step = isShiftHeld ? 0.01 : 0.1;
    return (
      <>
        <h3>{nodeHeading(enemy, node)}</h3>
        {NODE_AXES.map((axis, axisIndex) => (
          <NumberField key={axis} label={axis} value={position[axisIndex]} step={step} onChange={(value) => setAxis(axisIndex, value)} />
        ))}
      </>
    );
  };

  // how many nodes a path enemy's path has: each count respaces the path
  // as it was when the slider was grabbed, so sliding down and back keeps its
  // shape, and the whole slide is one change to undo
  const renderNodeSlider = (enemy: LevelObject) => {
    const turn = levelCfg ? levelCfg.turn : 0;
    const grab = () => {
      grabbedPath.current = enemyPath(enemy, turn, scale);
      dispatch({ type: "checkpoint" });
    };
    const changeCount = (count: number) => {
      const path = inNodes(grabbedPath.current ?? enemyPath(enemy, turn, scale), count);
      if (index !== null) {
        dispatch({ type: "update", index, changes: { path }, record: false });
      }
    };
    return <SliderField label="nodes" value={nodeCount(enemy)} min={2} max={PATH_NODES_MAX} onGrab={grab} onChange={changeCount} />;
  };

  // an enemy's number setting (a path enemy's speed, a rolling stone's start, a
  // badger's count) in its range; the whole slide is one change to undo
  const renderNumberSlider = (enemy: LevelObject, setting: NumberSetting) => {
    const changeSetting = (value: number) => {
      if (index !== null) {
        dispatch({ type: "update", index, changes: { [setting]: value }, record: false });
      }
    };
    const { min } = NUMBER_SETTING_RULES[setting];
    const max = settingMax(setting, objectType(enemy));
    const { label, step } = numberSlider(enemy, setting);
    return (
      <SliderField
        key={setting}
        label={label}
        value={numberSetting(enemy, setting)}
        min={min}
        max={max}
        step={step}
        onGrab={() => dispatch({ type: "checkpoint" })}
        onChange={changeSetting}
      />
    );
  };

  // the sliders for each number setting an enemy has
  const renderNumberSliders = (enemy: LevelObject) =>
    NUMBER_SETTINGS.filter((setting) => hasNumberSetting(enemy, setting)).map((setting) => renderNumberSlider(enemy, setting));

  // turns an enemy's path round, so it starts at the other end; a selected node stays selected
  const renderTurnRoundButton = (enemy: LevelObject) => {
    const turnRound = () => {
      const turn = levelCfg ? levelCfg.turn : 0;
      change({ path: turnedRound(enemy, turn, scale) });
      if (index !== null && state.selectedNode !== null) {
        dispatch({ type: "selectNode", index, node: nodeTurnedRound(state.selectedNode, nodeCount(enemy)) });
      }
    };
    return (
      <button className="drop" onClick={turnRound} title="It starts at the solid end, and turns round at the faded one">
        Reverse direction
      </button>
    );
  };

  // which way a rolling stone rolls first from where it starts: on along its track, or back
  const renderStoneReverseButton = (stone: LevelObject) => (
    <button className="drop" onClick={() => change({ reverse: stone.reverse ? undefined : true })} title="The arrow at the dot shows which way it rolls first">
      Reverse direction
    </button>
  );

  // which way a fish leaps or a lab assistant throws across the map: the way
  // the editor shows it, or the other way
  const renderAcrossReverseButton = (selected: LevelObject) => (
    <button className="drop" onClick={() => change({ reverse: selected.reverse ? undefined : true })} title={ACROSS_REVERSE_TITLES[objectType(selected)!]}>
      Reverse direction
    </button>
  );

  const isStone = (selected: LevelObject) => selected.kind === "obstacle" && selected.obstacle === "rolling_stone";
  const isReversedAcross = (selected: LevelObject) => objectType(selected) !== undefined && objectType(selected)! in ACROSS_REVERSE_TITLES;


  // raise is its height above the floor, kept as it's dragged about
  const renderObjectFields = (selected: LevelObject) => (
    <>
      <h3>{selected.kind}</h3>
      {selected.kind === "box" && renderBoxFields(selected)}
      {renderPositionFields(selected.at)}
      <NumberField label="raise" value={selected.raise} step={isShiftHeld ? 0.01 : 0.1} onChange={(raise) => change({ raise })} />
    </>
  );

  // lowers the box onto the floor below it, just clear of it
  const dropBox = (box: LevelObject) => {
    const z = dropToFloor(box, scale, triangles);
    if (z === null) {
      setHasNoFloor(true);
      return;
    }
    change({ at: [box.at[0], box.at[1], z] });
  };

  const renderDropButton = (box: LevelObject) => (
    <>
      <button className="drop" onClick={() => dropBox(box)}>Drop to floor</button>
      {hasNoFloor && <p className="warning">There's no floor below this box.</p>}
    </>
  );

  const renderOverlapNote = () => <p className="warning">This box is in a wall or another box.</p>;

  // the scale and turn the level is built with; saved to its level.cfg with the objects
  const renderLevelFields = (cfg: LevelCfg) => {
    const turn = String(cfg.turn) as (typeof TURNS)[number];
    return (
      <>
        <h3>Level</h3>
        <ChoiceField
          label="turn"
          value={TURNS.includes(turn) ? turn : "0"}
          choices={TURNS}
          onChange={(degrees) => onLevelCfg({ turn: Number(degrees) })}
        />
        <NumberField
          label="scale"
          value={cfg.scale}
          step={50}
          min={1}
          onChange={(units) => onLevelCfg({ scale: Math.max(1, Math.round(units)) })}
        />
        <p className="hint">
          Turn turns the level in the game, so its route runs the way Crash faces. Scale is the game's units a metre (400 is
          normal): a bigger scale makes the map bigger in the game, so boxes look smaller on it.
        </p>
      </>
    );
  };

  // the two colours, split as they are on the game's screen
  const renderSkyPreview = (sky: Sky) => (
    <div className="sky-preview">
      <div style={{ height: `${(100 * sky.split) / SKY_ROWS}%`, background: `rgb(${sky.top.join(",")})` }} />
      <div style={{ flex: 1, background: `rgb(${sky.bottom.join(",")})` }} />
    </div>
  );

  // the sky behind the level in the game; saved to its level.cfg with the turn and scale
  const renderSkyFields = (sky: Sky) => {
    const changeSky = (changes: Partial<Sky>) => onLevelCfg({ sky: { ...sky, ...changes } });
    return (
      <>
        <h3>Sky</h3>
        {renderSkyPreview(sky)}
        <ColourField label="top" value={sky.top} onChange={(top) => changeSky({ top })} />
        <ColourField label="bottom" value={sky.bottom} onChange={(bottom) => changeSky({ bottom })} />
        <NumberField
          label="split"
          value={sky.split}
          step={4}
          min={0}
          onChange={(rows) => changeSky({ split: Math.min(SKY_ROWS, Math.max(0, Math.round(rows))) })}
        />
        <p className="hint">
          The top colour fills the game's screen down to split (of its {SKY_ROWS} rows), and the bottom colour the rest.
          Build the level to see it in the game.
        </p>
      </>
    );
  };

  // how the follow camera looks at crash in the game; saved to its level.cfg with the rest
  const renderCameraFields = (camera: Camera) => {
    const changeCamera = (changes: Partial<Camera>) => onLevelCfg({ camera: { ...camera, ...changes } });
    return (
      <>
        <h3>Camera</h3>
        <SliderField
          label="distance ×"
          value={camera.distance}
          min={CAMERA_DISTANCE_MIN}
          max={CAMERA_DISTANCE_MAX}
          step={0.25}
          onGrab={() => {}}
          onChange={(distance) => changeCamera({ distance })}
        />
        <SliderField
          label="angle °"
          value={camera.angle}
          min={CAMERA_ANGLE_MIN}
          max={CAMERA_ANGLE_MAX}
          onGrab={() => {}}
          onChange={(angle) => changeCamera({ angle })}
        />
        <p className="hint">
          Distance is how far the camera is from Crash, times its usual distance. Angle is how far above him it looks
          down from (42 is usual). Build the level to see it in the game.
        </p>
      </>
    );
  };

  const SOUNDTRACK_NAMES = SOUNDTRACKS.map(({ name }) => name);
  // a soundtrack as the dropdown lists it: its levels, starred without aku aku's song
  const soundtrackLabel = (name: string) => {
    const { label, akuAkuSong } = soundtrack(name);
    if (akuAkuSong) {
      return label;
    }
    return `${label} *`;
  };

  // what plays with the level's own song (music.mid in its folder): on whose instruments, and with aku aku's song or not
  const ownSongNote = (own: LevelSong) => {
    let instruments = "on the instruments of the song picked here";
    if (own.sf2) {
      instruments = "on its music.sf2's instruments, so the song picked here isn't used";
    }
    let aku = " Without a music_aku.mid, aku aku's invincibility keeps it playing.";
    if (own.akuMid) {
      aku = " Its music_aku.mid is aku aku's song.";
    }
    return `This level has its own song, music.mid in its folder, which plays ${instruments}.${aku}`;
  };

  // the music the level plays in the game; saved to its level.cfg with the rest
  const renderMusicFields = (music: string) => (
    <>
      <h3>Music</h3>
      <ChoiceField label="song" value={music} choices={SOUNDTRACK_NAMES} labelOf={soundtrackLabel} onChange={(name) => onLevelCfg({ music: name })} />
      {song?.mid && <p className="hint">{ownSongNote(song)}</p>}
      <p className="hint">
        The song of the game's levels named. A song starred has no aku aku song, so his invincibility keeps the level's playing.
        Build the level to hear it in the game.
      </p>
    </>
  );

  const renderHint = () => (
    <p className="hint">
      Click an object to select it, then drag it across the floor. Pick something under Place and click the floor to add one.
    </p>
  );

  return (
    <aside className="panel">
      {object && index !== null ? (
        <>
          {renderObjectFields(object)}
          {hasPath(object) && renderNodeSlider(object)}
          {renderNumberSliders(object)}
          {hasPath(object) && renderTurnRoundButton(object)}
          {isStone(object) && renderStoneReverseButton(object)}
          {isReversedAcross(object) && renderAcrossReverseButton(object)}
          {hasNodes(object) && state.selectedNode !== null && renderNodeFields(object, state.selectedNode)}
          {object.kind === "box" && renderDropButton(object)}
          {warnings.has(index) && renderOverlapNote()}
          {pathWarnings.has(index) && <p className="warning">This path leaves the floor or runs through a wall.</p>}
          <button className="delete" onClick={() => dispatch({ type: "remove", index })}>Delete</button>
        </>
      ) : (
        <>
          {levelCfg && renderLevelFields(levelCfg)}
          {levelCfg && renderSkyFields(levelCfg.sky)}
          {levelCfg && renderCameraFields(levelCfg.camera)}
          {levelCfg && renderMusicFields(levelCfg.music)}
          {renderHint()}
        </>
      )}
    </aside>
  );
}
