# GFIT 3D — Milestone 2 / basic Milestone 3

Development exclusively by ChatGPT Work on `gfit-3d-body-v1`. No merge or production deployment.

## Engine checkpoint — 2026-10-06

The exact M1 male GLB is preserved. `body-male-parametric.glb` adds eight named relative morph targets (positions and normals) derived from the nine official MakeHuman young-male weight/muscle combinations, with the neutral combination implicit. Base POSITION, NORMAL and index buffers are identical to M1, including the original vertex order.

`modelo-3d-morphs.js` applies nonnegative bilinear weights over that 3×3 grid. This includes the authored combined high-weight/high-muscle and other corner shapes; it does not blindly add independent maximum morphs. At most four grid corners contribute. No global scale changes are used.

Slider endpoints 0 and 100 map to MakeHuman parameters 0.1 and 0.9; the midpoint is 0.5, exactly the M1 body. Units are visual, not percent fat. The deliberately bounded range avoids extrapolation and the most extreme source settings.

Geometry validation: 121 combinations across the complete exposed range, no new non-adjacent triangle intersections or collapsed faces; neutral identical to M1. Eight internal mouth contact pairs already exist in the original M1 mesh and persist: these are not body-morph defects, but the base is not a certified intersection-free anatomical mesh. These small contacts are retained to preserve the requested exact neutral; correcting the mouth would require a separately approved base correction. No visible body crossing was observed in front/profile/back checks. Report: `milestone-2-geometry.json`.

Khronos glTF Validator: zero errors and zero warnings. Model 3,056,784 bytes before HTTP compression. Rebuild with `tools/build-morphs.py`; test with `tools/verify-geometry.cjs` (development-only dependencies in its header).

Browser/UI validation and user-facing demo delivery are completed in the next checkpoint.
