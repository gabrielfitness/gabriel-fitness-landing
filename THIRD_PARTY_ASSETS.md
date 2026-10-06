# Third-party assets — GFIT 3D

Verified 2026-09-23. These entries apply only to the isolated 3D module.

## Body mesh and shape data — MakeHuman

- Source: https://github.com/makehumancommunity/makehuman
- Pinned commit: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`.
- Authors: MakeHuman Team. Mesh notices name Data Collection AB, Joel Palmius and Jonas Hauquier; macro targets additionally credit original author Manuel Bastioni (2014), rights transferred in 2016.
- License: **CC0 1.0 Universal**, including commercial use, modification and redistribution. Full text retained at `models/licenses/MAKEHUMAN-CC0.md`.
- Evidence: upstream `LICENSE.md`, section C, and CC0 notices inside each source OBJ/target. https://static.makehumancommunity.org/mpfb/faq/build_other_chargen.html explicitly allows using the base mesh and targets in another character generator.
- Source files and SHA-256 checksums: `models/body-male.source.json` (also retains original vertex IDs).
- Output: `models/body-male.glb`, an adult male preview mannequin. This is a prototype asset, not a final likeness or medically accurate representation of any client.
- Modifications: official young male ancestry targets averaged equally; official average-muscle/average-weight target applied; only `body` faces retained (no helper/joint geometry); quads triangulated consistently; unused vertices removed with stable mapping; decimeters converted to meters and feet placed at ground; smooth normals calculated; neutral matte material; no textures, clothing, rig, or animations.
- Rebuild: `python3 tools/build-body.py` downloads pinned data; `--source /path/to/makehuman` permits a local checkout. The script is original conversion code, not copied MakeHuman application code.
- CC0 does not require attribution; provenance and original notices are retained here voluntarily. No MakeHuman AGPL application code is bundled.

## Three.js 0.180.0

- Source/author: https://github.com/mrdoob/three.js/tree/r180 — three.js authors.
- Package: `three@0.180.0` from npm.
- License: MIT, full mandatory copyright and permission notice in `vendor/three/LICENSE`.
- Included unmodified: `three.module.min.js`, `three.core.min.js`, `OrbitControls.js`, `GLTFLoader.js`, `BufferGeometryUtils.js`.
- Local hosting avoids CDN availability and third-party requests at runtime. No runtime npm/build step.

## Asset selection decision

MakeHuman was selected because one established human topology supports adult male/female shapes and weight/muscle targets under CC0. The current male GLB establishes the viewer; M2 must validate target combinations and shape quality before exposing sliders. M5 will derive the female mesh from the same upstream base and vertex mapping, not purchase an unrelated topology.

A generic glTF sample character would unblock rotation but its clothing/topology would not establish the intended body-morph workflow. Building anatomy from primitives would discard existing authored assets. Neither is preferable here. No paid asset is required.

Human Atlas / BodyParts3D were reviewed as later internal-anatomy references only; no meshes, code or attribution obligations from them are incorporated in M1. They are not a substitute for a continuous deformable exterior.

## M2 — joint weight/muscle targets (2026-10-06)

Additional CC0 data from the **same pinned MakeHuman commit** as M1. Each source file explicitly states its CC0 release. Authors/rights holders and full license are the same as above; no MakeHuman application source code is included.

All nine combinations of `makehuman/data/targets/macrodetails/universal-male-young-{muscle}muscle-{weight}weight.target` are read, where each of `{muscle}` and `{weight}` is `min`, `average`, or `max`. The average/average target was already used by M1 and remains the implicit neutral. The other eight are embedded as relative POSITION and NORMAL morphs in `models/body-male-parametric.glb`.

Exact source URLs, original SHA-256 hashes, morph names and grid coordinates: `models/body-male-parametric.source.json`. Rebuild with `python3 tools/build-morphs.py --source /path/to/pinned/makehuman`, or omit `--source` to fetch the pinned files.

Modifications: select the exact original vertex IDs retained in M1; convert target offsets from decimeters to meters; subtract the neutral target; calculate target normals and encode relative normal deltas. The base position/normal/index buffers are copied byte-for-byte from M1. Runtime uses nonnegative bilinear weights across the joint 3×3 grid. No remeshing, subdivision, texture, rig, global body scaling, or invented anatomical offsets.

The sliders expose the interior `[0.1, 0.9]` of the source weight/muscle range as visual units 0–100, with neutral 50. This is not a body-fat percentage or clinical body composition measurement. No further third-party artwork was added.
