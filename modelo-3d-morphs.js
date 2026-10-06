// Joint MakeHuman weight/muscle interpolation. No object scaling or reindexing.
export const NEUTRAL = Object.freeze({ fat: 0.5, muscle: 0.5 });
// Visual units, not body-fat percentages. Range kept inside the authored grid.
export const RANGE = Object.freeze({ min: 0.1, neutral: 0.5, max: 0.9 });
export const PRESETS = Object.freeze({
  delgado: Object.freeze({ fat: 0.18, muscle: 0.32 }),
  atletico: Object.freeze({ fat: 0.28, muscle: 0.82 }),
  robusto: Object.freeze({ fat: 0.82, muscle: 0.52 })
});
export const MORPH_GRID = Object.freeze([
  [0, 0, 'muscle_min__weight_min'], [0, 0.5, 'muscle_min__weight_average'],
  [0, 1, 'muscle_min__weight_max'], [0.5, 0, 'muscle_average__weight_min'],
  [0.5, 1, 'muscle_average__weight_max'], [1, 0, 'muscle_max__weight_min'],
  [1, 0.5, 'muscle_max__weight_average'], [1, 1, 'muscle_max__weight_max']
]);
const clamp = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0.5));
export function sliderToParameter(value) {
  return RANGE.min + clamp(Number(value) / 100) * (RANGE.max - RANGE.min);
}
export function parameterToSlider(value) {
  return Math.round((value - RANGE.min) / (RANGE.max - RANGE.min) * 100);
}
export function morphWeights(fat, muscle) {
  fat = clamp(fat); muscle = clamp(muscle);
  // Tensor product of the piecewise-linear axis weights. At most 4 active
  // corners, with the neutral corner implicitly represented by the base mesh.
  return MORPH_GRID.map(([m, w]) =>
    Math.max(0, 1 - 2 * Math.abs(muscle - m)) * Math.max(0, 1 - 2 * Math.abs(fat - w)));
}
export function createBodyMorphs(mesh) {
  const indices = MORPH_GRID.map(([, , name]) => mesh.morphTargetDictionary?.[name]);
  if (indices.some(i => !Number.isInteger(i)) || !mesh.geometry.morphTargetsRelative ||
      mesh.geometry.morphAttributes.position?.length !== 8 || mesh.geometry.morphAttributes.normal?.length !== 8) {
    throw new Error('The M2 GLB must have all 8 named relative position/normal morphs');
  }
  let state = { ...NEUTRAL };
  return {
    get state() { return { ...state }; },
    apply(fat, muscle) {
      state = { fat: clamp(fat), muscle: clamp(muscle) };
      morphWeights(state.fat, state.muscle).forEach((weight, index) => {
        mesh.morphTargetInfluences[indices[index]] = weight;
      });
    }
  };
}
