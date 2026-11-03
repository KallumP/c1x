// a level source's .obj, with the textures its .mtl names, shown as the
// game shows its faces: both sides, textures repeating and unfiltered
import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { levelFilesUrl, type LevelInfo } from "../api";
import { boxUvs } from "./boxUvs";

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

// a plain lit material with the .mtl's texture or colour (the .mtl's phong
// ones leave walls facing away from the light nearly black)
function likeTheGame(material: THREE.Material): THREE.Material {
  const { map, color } = material as THREE.MeshPhongMaterial;
  if (map) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.magFilter = THREE.NearestFilter;
  }
  return new THREE.MeshLambertMaterial({ map, color: map ? 0xffffff : color, side: THREE.DoubleSide });
}

// normals and uvs for a mesh exported without them
function fillIn(geometry: THREE.BufferGeometry) {
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  if (!geometry.getAttribute("uv"))
    geometry.setAttribute("uv", new THREE.BufferAttribute(boxUvs(geometry.getAttribute("position").array), 2));
}

function retexture(mesh: THREE.Mesh) {
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(likeTheGame) : likeTheGame(mesh.material);
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
    if (!(child instanceof THREE.Mesh)) return;
    fillIn(child.geometry);
    retexture(child);
  });
  return group;
}
