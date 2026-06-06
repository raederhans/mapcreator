<p align="right">
  <a href="./README.md"><img src="https://img.shields.io/badge/English-111111?style=for-the-badge" alt="English"></a>
  <a href="./README.zh-CN.md"><img src="https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-2563eb?style=for-the-badge" alt="Chinese"></a>
</p>

# Scenario Forge

Scenario Forge is a scenario-first map creation workbench for alternate history, strategy modding, and geopolitical storytelling.

It gives creators one place to choose a world state, edit political control, tune the map's visual style, add strategic overlays, inspect transport layers, and export a polished map image or reusable project file.

**Live demo:** https://raederhans.github.io/scenario-forge/

**Updated:** 2026-06-06

## Highlights

| Area | What you can do |
| --- | --- |
| Scenario maps | Start from Blank Map, Modern World, HOI4 1936, HOI4 1939, or TNO 1962. |
| Political editing | Repaint ownership and controller state, inspect split ownership, and work across ownership, controller, and frontline views. |
| Visual style | Tune oceans, borders, parent borders, physical regions, urban areas, city points, rivers, textures, day-night shading, and reference images. |
| Strategic presentation | Add legends, frontlines, operational lines, operation graphics, labels, and unit-counter style overlays. |
| Transport context | Explore roads, rail, airports, ports, mineral resources, energy facilities, industrial land, logistics hubs, and layer ordering through the Transport workbench. |
| Export workflow | Export PNG/JPG snapshots, adjust image brightness/contrast/saturation, manage layer order, and prepare higher-resolution outputs up to 8K. |
| Project files | Save an editable project JSON with scenario, appearance, transport, strategic annotations, reference alignment, and export settings. |
| Community preview | In local backend mode, test account sessions, Cloud Saves, publishing, community downloads, comments, reports, and admin review tools. |
| Modding preview | In developer/local preview mode, use HGO runtime preview and palette tools to validate HOI4-style country identity, flags, colors, and rendering. |
| Localization | Use the interface in English or Simplified Chinese. |

## Who It Is For

- Alternate-history creators who need fast, editable political maps.
- HOI4, TNO, Kaiserreich, and Red Flood modders exploring world-state ideas.
- Scenario and campaign designers preparing map-led concepts.
- Writers, researchers, and presenters who need a clear geopolitical visual.
- Map builders who want saved projects, style control, and clean exports in the same workspace.

## Try It

### Online demo

Open the live build:

- https://raederhans.github.io/scenario-forge/

The online version is the best starting point for scenario editing, appearance tuning, project files, and exports.

### Local app

Run the full local editor:

```bat
start_dev.bat
```

Start faster after the data has already been built:

```bat
start_dev.bat fast
```

Start with a clean runtime session:

```bat
start_dev.bat fresh
```

### Local backend preview

Open the local backend and community preview:

```bat
start_backend_preview.bat
```

This local mode stores preview backend data under `.runtime/backend/` on your machine. It is useful for trying Cloud Saves, public community posts, downloads, comments, reports, and admin moderation flows.

## Typical Workflow

1. Choose a scenario baseline.
2. Edit ownership, controller, or frontline state.
3. Adjust visual layers such as borders, water, terrain, cities, rivers, transport, and reference imagery.
4. Add presentation elements such as legends, operational lines, unit counters, labels, and operation graphics.
5. Save an editable project JSON, then export the final image or layer package.

## Feature Status

The main editor path is ready for normal map creation: scenario switching, political edits, appearance controls, project save/load, strategic annotations, and exports.

Some larger systems are shown as previews:

- **Cloud Saves and community:** available through the local backend preview.
- **Transport workbench:** source-backed and cached transport data is available across multiple categories. Roads, rail, airports, and ports currently connect most consistently to the main map; broader global coverage continues growing.
- **HGO runtime preview:** a developer/local preview for country identity, palette, flag, and raster-render validation.

## License

The project code and documentation are available under the **MIT License**.

Third-party datasets and derived assets keep their original source terms and provenance records.

## Maintained By

Maintained by **[@raederhans](https://github.com/raederhans)**.

## Bug Reports

If something breaks, looks wrong, or feels inconsistent, please open an issue:

- https://github.com/raederhans/scenario-forge/issues

Helpful bug reports usually include the scenario you were using, your browser and OS, exact steps to reproduce the issue, and a screenshot or exported project file when relevant.

## Data Sources

Scenario Forge combines public geographic and reference datasets with project-specific derived assets. The main source families include:

| Source | Used for |
| --- | --- |
| [Natural Earth](https://www.naturalearthdata.com/) | Base geography, countries, coastlines, and small-scale reference layers. |
| [geoBoundaries](https://www.geoboundaries.org/) | Administrative boundary reference data. |
| [GeoNames](https://www.geonames.org/) | Place names and settlement reference data. |
| [NOAA ETOPO 2022](https://www.ncei.noaa.gov/products/etopo-global-relief-model) | Global relief, bathymetry, and physical terrain context. |
| [NASA Black Marble](https://blackmarble.gsfc.nasa.gov/) | Night lights and city-light texture context. |
| [OpenStreetMap](https://www.openstreetmap.org/) | Roads, rail, facilities, and other transport/context features. |
| [Geofabrik](https://download.geofabrik.de/) | Regional OpenStreetMap extracts used for transport workbench data. |
| [Japanese MLIT road data (N06)](https://nlftp.mlit.go.jp/ksj/) | Japan road hardening and transport preview reference data. |

Detailed provenance appears in `data/source_ledger.json`, `.provenance.json` files under `data/`, transport source recipes under `data/transport_layers/`, and generated asset source records.
