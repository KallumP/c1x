// objects named collision... are collision only: solid in the game but not
// drawn (isCollisionOnly in builder/faces.ts), so the editor hides them too
export const isCollisionOnly = (objectName: string) => objectName.toLowerCase().startsWith("collision");
