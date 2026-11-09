# Schiffy Runner: Tripo game copies (2026-11-07)

Ruben's own Tripo models, prepped in Blender to replace KayKit / Tiny Treats props. NOT wired into main.js yet.

- Every file: Y up, origin = base centre (centroid of the bottom 6 %), base at y = 0, already at the in-game height in
  metres (so `fitHeight(model, h)` scales ~1.0). Draco meshes + WebP textures (`EXT_texture_webp`, three r186 loads both;
  `shots/tripo_prep/loadcheck.html` = proof page). Tripo PBR kept: base colour + normal map (+ metallic/roughness map
  where it varies; flat ones became constant factors). Tris: obstacles + hive tree 50k, scenery 32-40k, filler 20k.
- Note: `fitHeight` re-centres by the bounding box, not the base; for trees that is a few cm off the trunk (fine).
- Total: 38 files, 16.22 MB (budget 30 MB; float_isle +0.40 MB, 2026-11-08; S2 winter pines + snowman +1.56 MB, 2026-11-08;
  S3 fairy trees + bush + 6 mushrooms +3.24 MB, 2026-11-08).
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
| float_isle | Elderglow: `Elderglow/Tiles & Terrain/float_isle_e_r2 (pawty).glb` (only Elderglow model allowed in Runner) | vn kit isle_float + isle_castle (all 4 sky isles) | 10 (scaled in game by max size, 10-27 m) | ~ | 36,000 | 0.40 | sky only, no fog; varied yaw / tilt / mirror in `ISLES` (main.js) |
| pine_snow_a | Downloads: `Downloads/Unsorted/tripo_convert_a7171493-8969-424a-afb3-c34778330866.glb` (U102) | winter scenery (S2) | 5.2 | ~2.8 x 3.0 | 32,000 | 0.41 | snowy pine; random yaw is fine |
| pine_snow_b | Downloads: `Downloads/Unsorted/tripo_convert_a990c8d3-c5a7-4278-8b49-a7e2785dc1c7.glb` (U104) | winter scenery (S2) | 5.0 | ~3.3 x 3.4 | 32,000 | 0.39 | snowy pine, fuller; random yaw is fine |
| pine_snow_c | Downloads: `Downloads/Unsorted/tripo_convert_cacfad4b-0d88-4f2a-af9f-743c8062c75e.glb` (U122) | winter scenery (S2) | 5.0 | ~3.0 x 3.3 | 32,000 | 0.40 | snowy pine, darker needles; random yaw is fine |
| snowman | Pawty: `Pawty/Props & Items/snowman 3d model.glb` | winter edge prop (S2, stands in for bench/signpost spots) | 1.3 | ~0.7 x 1.0 | 25,000 | 0.36 | top hat + red scarf; edge-prop rotation like the bench |
| tree_fairy_blossom | Downloads: `Downloads/Unsorted/tripo_convert_2ec56a42-de9b-4482-ad58-88979ff21db5.glb` (U28) | fairy scenery (S3) | 4.8 | ~3.2 x 3.2 | 31,998 | 0.45 | blue-violet crown, pink blossoms; random yaw is fine |
| tree_wisteria | Downloads: `Downloads/Unsorted/tripo_convert_04262872-fbe2-4e66-b93e-0371d9677054.glb` (U1) | fairy scenery (S3) | 4.8 | ~3.0 x 3.0 | 32,000 | 0.47 | purple wisteria weeping tree; random yaw is fine |
| tree_twotier | Downloads: `Downloads/Unsorted/tripo_convert_1ba98ba2-8cc3-42db-8146-cf8f474115b3.glb` (U14) | fairy scenery (S3) | 5.0 | ~2.8 x 2.8 | 32,000 | 0.46 | purple two-tier crown, vine on trunk; random yaw is fine |
| bush_berry_teal | Downloads: `Downloads/Unsorted/tripo_convert_92e0043e-1c51-4602-bffd-50bc3decaf0d.glb` (U89) | fairy bush (S3) | 1.0 | ~1.1 x 1.1 | 24,998 | 0.39 | teal leaves, blue berries; random yaw is fine |
| shroom_teal | Downloads: `Downloads/Unsorted/tripo_convert_09c8c3e2-41bb-40d8-acca-1e58ffd311c4.glb` (U3) | fairy giant mushroom (S3), glows at night | 1.6 (2.0 / 1.7 in game) | ~1.2 | 25,000 | 0.25 | grass tuft base; random yaw is fine |
| shroom_green | Downloads: `Downloads/Unsorted/tripo_convert_7c0b42de-13fe-4886-a690-863d87efb3e1.glb` (U74) | fairy giant mushroom (S3), no glow | 1.5 (1.8 in game) | ~1.2 | 25,000 | 0.25 | grass tuft base; random yaw is fine |
| shroom_pink | Downloads: `Downloads/Unsorted/tripo_convert_eca8ebae-9043-4f51-a3df-da58bef8e393.glb` (U140) | fairy giant mushroom (S3), glows at night | 1.5 (1.9 in game) | ~1.3 | 25,000 | 0.29 | flower-petal cap; random yaw is fine |
| shroom_purple | Downloads: `Downloads/Unsorted/tripo_convert_70cb0f8a-e769-41dd-8684-b3cb4d95347c.glb` (U68) | fairy mushroom, edge prop (S3), glows at night | 1.0 | ~0.9 | 20,000 | 0.12 | plain, untextured-looking (flat colour); random yaw is fine |
| shroom_trio | Downloads: `Downloads/Unsorted/tripo_convert_9b7cfc15-bb2b-4e35-a10b-a96a65b3b9af.glb` (U95) | fairy mushroom cluster, edge prop (S3), glows at night | 1.0 | ~0.8 | 25,000 | 0.26 | 3 caps + leaves; edge rotation |
| shroom_spotted | Downloads: `Downloads/Unsorted/tripo_convert_fa63915f-ca78-4fd6-ae6a-f5e3b34e1282.glb` (U153) | fairy mushroom (S3), glows at night | 1.3 (1.6 in game) | ~0.9 | 25,000 | 0.30 | pointed spotted cap; random yaw is fine |

## Phone copies: `lo/` (2026-11-08, quality presets VERYLOW + LOW; were LOW + MID before the tier rework)

- Same 38 ids, same heights / origins, from the same masters: `prep.py ... <out=assets/tripo/lo> "" phone`. Targets:
  obstacles 5k (hedges 3k), hive / scenery oak 8k, house 8k, isle 7k, scenery trees / bushes / rocks / snowman 5k,
  filler (fern, mushrooms, bench, signpost, shrooms) 3k; base colour 1024 (obstacles) / 512, normal 512, MR 1024 or flat.
  Per-id override = `ptris` in picks.json. Total 5.4 MB (vs 16.2 MB). main.js loads exactly one set: `tripo/lo` (VERYLOW, LOW), `tripo/md` (MID) or `tripo` (HIGH).

## Mid copies: `md/` (2026-11-08, quality preset MID)

- Same 38 ids, same heights / origins, from the same masters: `prep.py ... <out=assets/tripo/md> "" md`. Targets ~2.5x
  the phone copies: tier hi 12k, mid 12k, lo 8k; per-id `mtris` in picks.json, else 2.5x `ptris` (hive / scenery oak 20k,
  house 20k, isle 17.5k, hedges 7.5k, snowman 12.5k), never above the full copy. Base colour 1024, normal 1024 everywhere,
  MR 1024 or flat. Total 8.8 MB (lo 5.4, full 16.2).

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
- Sky (2026-11-08): isles = float_isle above; clouds are made in code (main.js `cloudGeo`); `assets/schiffy-env/vn_kit.glb` is no longer loaded (file kept). Flyers = rigged Tripo birds in `assets/birds` (crow + its CC-BY credit removed 2026-11-08).

## Winter (S2, 2026-11-08)

- SCENERY_WINTER (main.js): mostly pine_snow_a/b/c (12 of 20 entries), plus 'name@frost' variants of tree_oak / tree_round /
  tree_birch / bush_broadleaf / hedge_leafy / rock_boulders / rock_pile / fern (leaves shifted to a muted cool green + snow
  white on up-facing surfaces, `LEAF.frost` + `SNOW_GLSL`, cloned materials), snowman + bench + signpost at the edge.
  Tufts = Grass @frostgrass. Ground = code snow textures mixed in by `snowGround` (uSnow), not new files.
- Looked at, not used: bare trees U45 (pruned stumps) and U7 (gnarled, spooky) from cosy-island tripo_map `dead` rows.

## Fairy (S3, 2026-11-08)

- Ruben's set: U28 blue-violet blossom tree + 6 coloured mushrooms (U3 / U74 / U140 / U68 / U95 / U153). Extra from the
  Downloads search (cosy-island tripo_map 'Fantasy trees'): U1 wisteria, U14 two-tier, U89 teal berry bush (max 3).
  Looked at, not used: U19 purple weeping (too close to U1), U26 / U66 / U67 / U103 teal trees, U73 blue bellflower.
- SCENERY_FAIRY (main.js): the 3 purple trees + tree_blossom (pink) + 'tree_round@violet' / 'tree_birch@periwinkle' /
  'bush_broadleaf@lilac' leaf variants, teal berry bushes, giant mushrooms beside the path (1.6-2.0 m), trio + plain purple
  at the path edge. Tufts = Grass @lilacgrass. Glow mushrooms (all but the green one) = emissiveMap = map, masked to
  saturated non-green texels (caps glow, stems + grass base don't), PAL `shroomGlow` (day 0.05 -> night 0.75), no lights.
  Ground = code fairy textures mixed in by `snowGround` (uFairy): soft lilac grass, pale lavender / cream path.
  Sparkles = one Points object (46 soft yellow motes beside the path, fairy only, brighter at night).
