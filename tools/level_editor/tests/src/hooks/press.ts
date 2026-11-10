// a key press as a keydown event gives it, with ctrl and shift held or not
export const press = (key: string, held: { ctrl?: boolean; shift?: boolean } = {}) =>
  ({ key, ctrlKey: !!held.ctrl, metaKey: false, shiftKey: !!held.shift });
