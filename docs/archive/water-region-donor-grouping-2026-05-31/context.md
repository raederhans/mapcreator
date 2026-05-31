# Water Region Donor Grouping Context

2026-05-31: Started from report that the Water Region inspector list is dominated by many Adriatic donor-state fragments, making normal search terms such as `c` surface too many low-value donor rows before other named seas.

2026-05-31: Initial scope: inspect list/search and water-region data. Avoid changing geography unless there is a deterministic existing grouping key or a clearly local UI grouping layer.

2026-05-31: Static `water_regions.geojson` contains normal named water regions such as Caribbean Sea; the clutter comes from scenario detail chunks such as `political.detail.country.atl.json`. `Gulf of Gabes Exposure Sea 8598-9013-0/1/2` and `Completion 1..11` share `region_group=atlantropa_gulf_of_gabes_exposure_sea`.

2026-05-31: Chosen fix: group only inspector list rows whose display name ends in a deterministic fragment suffix (`number-number-number` or `Completion N`) and shares the same water type/group/parent/source/base title. Geometry and raw feature ids remain unchanged.

2026-05-31: Implemented in the Water/Special sidebar controller. Search/result counts use grouped display items; row dataset and override/history flows keep the original feature ids. Verified with targeted unittest, syntax checks, inline Node smoke, and `verify:pages-dist`.
