# Schiffy Runner: Tripo game copies (2026-11-07)

Ruben's own Tripo models, prepped in Blender to replace KayKit / Tiny Treats props. NOT wired into main.js yet.

- Every file: Y up, origin = base centre (centroid of the bottom 6 %), base at y = 0, already at the in-game height in
  metres (so `fitHeight(model, h)` scales ~1.0). Draco meshes + WebP textures (`EXT_texture_webp`, three r186 loads both;
  `shots/tripo_prep/loadcheck.html` = proof page). Tripo PBR kept: base colour + normal map (+ metallic/roughness map
  where it varies; flat ones became constant factors). Tris: obstacles + hive tree 50k, scenery 32-40k, filler 20k.
- Note: `fitHeight` re-centres by the bounding box, not the base; for trees that is a few cm off the trunk (fine).
- Total: 23 files, 10.49 MB (budget 30 MB).
- Masters (raw, unchanged): `Asset Library/ours/runner/masters/<id>.glb`. Rebuild: `Asset Library/ours/runner/tools/prep.py`
  with `picks.json` (source paths, tier, height, cut/rotz). Checks: `check_render.py` + `compose_check.py` -> `shots/tripo_prep/<id>.png`,
  `loadcheck.py`; contact sheet `shots/tripo_prep/contact_sheet.png`.

| id | source | replaces (role) | height m (in-game) | footprint m (x by z) | tris | MB | facing / notes |
|---|---|---|---|---|---|---|---|
| tree_oak | Downloads: `Downloads/Nature/stylized tree 3d model.glb` | Tree_1_A + hive tree | 5.0 scenery / 5.2 hive | 4.91 x 4.53 | 49,998 | 0.84 | trunk base at the origin; crown leans a bit toward -X/+Z |
| cactus_barrel | Downloads: `Downloads/Unsorted/tripo_convert_0a5dca9e-86b1-44a8-8923-97bc530cceed.glb` | cactus_small_A | 0.9 | 0.89 x 0.84 | 49,998 | 0.45 | round-ish; random yaw is fine |
| cactus_saguaro | Downloads: `Downloads/Unsorted/tripo_convert_f35b8dcd-b9dd-4f7c-bffa-781faa9ebcfa.glb` | cactus_medium_A | 1.1 | 0.41 x 0.81 | 49,998 | 0.53 | arms spread along Z; random yaw is fine |
| rock_mossy | Downloads: `Downloads/Unsorted/tripo_convert_773c7dbe-6e37-4f21-a16e-9b837e29b7c6.glb` | Rock_1_A (obstacle) | 0.7 | 0.66 x 0.71 | 50,000 | 0.35 | round-ish; random yaw is fine |
| bush_holly | Downloads: `Downloads/Nature/holly bush 3d model.glb` | Bush_2_A (obstacle) | 0.8 | 1.01 x 1.00 | 49,999 | 0.77 | round-ish; random yaw is fine |
| hedge_leafy | Downloads: `Downloads/Unsorted/tripo_convert_52e8f565-1495-419e-a96a-af83c04e25aa.glb` | hedge Bush_2_A | 0.55 | 1.21 x 1.25 | 50,000 | 0.45 | round-ish; random yaw is fine |
| hedge_bush | Downloads: `Downloads/Unsorted/tripo_convert_04af0f5d-fb7b-4c23-882b-d443a59440e5.glb` | hedge Bush_1_A | 0.55 | 0.82 x 0.92 | 50,000 | 0.56 | round-ish; random yaw is fine |
| log_branch | Downloads: `Downloads/Unsorted/tripo_convert_833eab30-f15b-4617-af9c-48aab80c81a3.glb` | fence_straight (hurdle) | 0.7 | 1.45 x 0.35 | 50,000 | 0.40 | long axis = X (across the path, like fence_straight): keep `fixed` (rotation 0) |
| crate | Pawty: `Pawty/Props & Items/wooden crate 3d model.glb` | package | 0.6 | 0.81 x 0.85 | 50,000 | 0.46 | round-ish; random yaw is fine |
| tree_pine | Downloads: `Downloads/Nature/stylized tree 3d model (3).glb` | Tree_3_A / Tree_3_B | 5.5 | 2.18 x 2.32 | 31,999 | 0.52 | round-ish; random yaw is fine |
| tree_birch | Downloads: `Downloads/Unsorted/tripo_convert_0ffaae06-04e6-4bda-a734-e6ec44ec65fe.glb` | Tree_2_A / Tree_2_C | 4.6 | 3.07 x 3.98 | 32,000 | 0.51 | round-ish; random yaw is fine |
| tree_blossom | Downloads: `Downloads/Unsorted/tripo_convert_3f29fced-2bee-4521-aa4e-dfefd505a416.glb` | Tree_4_A | 4.5 | 3.37 x 3.31 | 32,000 | 0.44 | round-ish; random yaw is fine |
| tree_autumn | Downloads: `Downloads/Unsorted/tripo_convert_16fedd0f-b9ad-43a3-a88a-498c10222b4e.glb` | Tree_4_B / Tree_Bare_1_A | 4.8 | 3.64 x 3.55 | 31,993 | 0.44 | round-ish; random yaw is fine |
| tree_round | Downloads: `Downloads/Unsorted/tripo_convert_10266bc6-397c-4e79-8fc6-9f0e86f026b6.glb` | Tree_1_B / tree_large | 4.6 | 3.33 x 3.32 | 31,998 | 0.39 | round-ish; random yaw is fine |
| tree_apple | Pawty: `Pawty/Nature/apple tree 3d model.glb` | tree (Tiny Treats) | 4.2 | 3.76 x 3.79 | 32,000 | 0.49 | round-ish; random yaw is fine |
| bush_broadleaf | Downloads: `Downloads/Unsorted/tripo_convert_1837ec05-f9a9-4f14-8111-d92840d6dfb8.glb` | Bush_1_A / Bush_3_A / Bush_4_A (scenery) | 1.0 | 1.08 x 1.07 | 31,998 | 0.38 | round-ish; random yaw is fine |
| rock_boulders | Downloads: `Downloads/Unsorted/tripo_convert_1c38d9d4-8838-4281-96e6-ea5506918835.glb` | Rock_2_A (scenery) | 0.8 | 0.95 x 0.97 | 31,999 | 0.35 | round-ish; random yaw is fine |
| rock_pile | Downloads: `Downloads/Nature/rock pile 3d model.glb` | Rock_3_A (scenery) | 0.7 | 1.43 x 1.22 | 31,999 | 0.36 | round-ish; random yaw is fine |
| house | Pawty: `Pawty/Buildings/toy house 3d model.glb` | house | 6.0 | 6.44 x 6.49 | 40,000 | 0.59 | door faces +Z (toward the camera at rotation 0) |
| fern | Downloads: `Downloads/Unsorted/tripo_convert_2f6522b3-f51e-4e28-874d-a16625cadc50.glb` | foliage_A | 0.9 | 1.42 x 1.42 | 20,000 | 0.26 | round-ish; random yaw is fine |
| mushrooms | Downloads: `Downloads/Unsorted/tripo_convert_3701028c-1098-428f-af10-d942e6747029.glb` | new small filler | 0.6 | 0.46 x 0.47 | 20,000 | 0.31 | round-ish; random yaw is fine |
| bench | Pawty: `Pawty/Furniture/colorful bench 3d model.glb` | bench_A | 0.9 | 0.87 x 1.15 | 19,999 | 0.40 | seat front faces +Z; the edge-prop rotation (side * -PI/2) then turns it to face the path, same as bench_A |
| signpost | Pawty: `Pawty/Props & Items/cute signpost 3d model.glb` | mailbox | 1.1 | 0.45 x 1.06 | 20,000 | 0.22 | sign arm points along Z (run direction) at rotation 0; turn PI/2 to face the camera across the path |

## Gameplay sizes (obstacles keep the old prop height)

- cactus_small_A 0.9 -> cactus_barrel 0.9 (wider than the potted cactus: 0.89 m; the hitbox caps hz at 0.55 anyway).
- cactus_medium_A 1.1 -> cactus_saguaro 1.1.  package 0.6 -> crate 0.6.  Rock_1_A 0.7 -> rock_mossy 0.7.
- Bush_2_A 0.8 (ground) -> bush_holly 0.8.  Hedge (HEDGE_H 0.55): Bush_1_A -> hedge_bush, Bush_2_A -> hedge_leafy (both 0.55).
- fence_straight 0.8 (fixed) -> log_branch 0.7: a log lying across the path, 1.45 m long, keep it `fixed`. Its stubs reach
  0.7 m, the trunk itself is lower (~0.35 m): reads lower than the fence; keep hitbox y1 = 0.7 (half.y * 2) for fairness.
- Hive branch: Tree_1_A 5.2 -> tree_oak 5.2 at the left edge (code bough + leaf clumps stay; the clumps could use
  hedge_bush / hedge_leafy instead of Bush_1_A / Bush_2_A).

## Scenery mapping (SCENERY list)

- Trees: Tree_1_A -> tree_oak, Tree_1_B + tree_large -> tree_round, Tree_2_A/2_C -> tree_birch, Tree_3_A/3_B -> tree_pine,
  Tree_4_A -> tree_blossom, Tree_4_B + Tree_Bare_1_A -> tree_autumn, tree (Tiny Treats) -> tree_apple. Old heights stay.
- Bushes: Bush_1_A / Bush_3_A / Bush_4_A -> bush_broadleaf (and bush_holly / hedge_* for variety). Rocks: Rock_2_A -> rock_boulders,
  Rock_3_A -> rock_pile. foliage_A -> fern. mushrooms = new optional filler (0.6 m) beside the path.
- Edge props: bench_A -> bench (0.9), mailbox -> signpost (1.1; no Tripo mailbox exists). house -> house (6).

## Left on KayKit / Tiny Treats

- Grass_1_A / Grass_2_A tufts (36 tiny instances near the path; a 20k-tri Tripo tuft x36 is not worth it).
- No Tripo match: mailbox (signpost stands in), fence_straight as a fence (log replaces it as the hurdle).
- Sky isles + clouds (Schiffy vn kit) are not part of this job. Flyers = rigged Tripo birds in `assets/birds` (crow + its CC-BY credit removed 2026-11-08).
