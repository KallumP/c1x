// a level source's .obj, with the textures its .mtl names, shown as the
// game shows its faces: both sides, textures repeating and unfiltered
import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { levelFilesUrl, type LevelInfo } from "../api";

async function fetchText(url: string): Promise<string | null> {
  const res = await fetch(url);
  return res.ok ? res.text() : null;
}

async function materialsFor(objText: string, base: string) {
  const mtllib = /^mtllib\s+(.+)$/m.exec(objText)?.[1].trim();
  const mtlText = mtllib ? await fetchText(base + mtllib) : null;
  if (!mtlText) return null;
  const materials = new MTLLoader().setResourcePath(base).parse(mtlText, base);
  materials.preload();
  return materials;
}

function showLikeTheGame(material: THREE.Material) {
  material.side = THREE.DoubleSide;
  const map = (material as THREE.MeshPhongMaterial).map;
  if (!map) return;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.NearestFilter;
}

export async function loadLevel(level: LevelInfo): Promise<THREE.Group> {
  const base = levelFilesUrl(level.name);
  const objText = await fetchText(base + level.obj);
  if (objText === null) throw new Error(`couldn't load ${level.obj}`);
  const loader = new OBJLoader();
  const materials = await materialsFor(objText, base);
  if (materials) loader.setMaterials(materials);
  const group = loader.parse(objText);
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) [child.material].flat().forEach(showLikeTheGame);
  });
  return group;
}
