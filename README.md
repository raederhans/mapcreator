🗺️ Map Creator: High-Precision Historical Mapping Tool
Map Creator is a specialized web-based GIS tool designed for creating detailed historical and alternate history maps (e.g., for Hearts of Iron IV modding communities like TNO, Kaiserreich).

Unlike generic map chart tools, Map Creator features a Hybrid-Resolution Engine that mixes standard NUTS-3 regions with high-fidelity District-level data (Admin-Level 2) for specific countries, allowing for the accurate reconstruction of historical borders (e.g., 1871 Prussia, Vichy France, Pre-WW2 Poland).

(Replace with actual screenshot)

✨ Key Features
🌍 Hybrid-Resolution Geometry
Base Layer: European NUTS-3 regions for general mapping.

Holistic Replacement:

🇫🇷 France: Fully replaced with ~300+ Arrondissements (Districts) for precise internal borders (Vichy, Burgundy).

🇵🇱 Poland: Fully replaced with ~380 Powiaty (Counties) to accurately depict 1939 borders and Prussian territories.

Surgical Stitching: Seamless integration of high-res datasets without geometry overlap or "ghosting."

🎨 Visual & Scenario Editor (The "Tracer" Suite)
Map Style Panel: Customize internal border opacity/width to hide data seams. Separate controls for "Empire Borders" and Coastlines.

Image Overlay (Tracer): Upload local historical maps or reference images, adjust opacity/scale, and overlay them directly on the map to guide your creation.

Preset Builder: A built-in "Dev Mode" allows you to visually select regions and export ID lists to create new historical country presets (no more manual ID typing!).

🌐 Localization System
Auto-Translation: Python-based CLI that automatically generates locales.json.

Incremental Updates: Detects new geometry IDs and appends them to the translation file without overwriting existing work.

Offline Seeds: Built-in dictionary for major European regions to minimize manual translation work.

🚀 Quick Start
Prerequisites
Python 3.8+ (for data processing pipeline)

Local Web Server (e.g., Python http.server or Node http-server)

Installation
Clone the repository

Bash
git clone https://github.com/yourusername/map-creator.git
cd map-creator
Install Python Dependencies

Bash
pip install geopandas topojson mapclassify matplotlib requests
Run the Development Environment Simply run the batch script. This will update translations and start the server.

DOS
.\start_dev.bat
Or manually:

Bash
python tools/translate_manager.py
python -m http.server 8000
Open Browser Navigate to http://localhost:8000.

🛠️ Data Pipeline (init_map_data.py)
The core engine is powered by init_map_data.py, which performs the following:

Download: Fetches raw GeoJSONs from Natural Earth and specific GitHub repositories (France/Poland).

The Purge: Removes low-res NUTS-3 regions for target countries.

Holistic Replacement: Injects high-res Admin-2 data, standardizes IDs (e.g., FR_ARR_, PL_POW_), and unifies coordinate systems.

Topology: Converts the merged GeoDataFrame into TopoJSON for efficient web rendering.

To regenerate map data (e.g., after modifying the script):

Bash
python init_map_data.py
🎮 How to Create a New Historical Preset
Find a Reference: Locate a map image of the country you want to add (e.g., "Republic of Komi").

Upload Overlay: In the Map Creator left sidebar, upload the image and align it with the map using the Scale/Opacity sliders.

Enter Edit Mode: In the Right Sidebar ("Historical Presets"), click "Edit" (or toggle Dev Mode).

Trace: Click the regions on the map that match your reference image.

Save/Export:

Click Save to keep it in your local browser.

Click Copy IDs to get the JSON array, then paste it into js/presets.js to make it permanent for all users.

📂 Project Structure
map-creator/
├── data/
│   ├── europe_topology.json  # Generated map data
│   ├── locales.json          # Translation file (EN/ZH)
│   └── ...                   # Cached GeoJSONs
├── js/
│   ├── app.js                # Main frontend logic (D3/Canvas)
│   └── presets.js            # Historical state definitions
├── tools/
│   ├── translate_manager.py  # Incremental translation tool
│   └── geo_seeds.py          # Offline translation dictionary
├── init_map_data.py          # The Python Geometry Engine
├── index.html                # Main entry point
├── start_dev.bat             # One-click launcher
└── README.md
🤝 Credits & Data Sources
GIS Base: Natural Earth & Eurostat NUTS.

France Data: gregoire-david/france-geojson (Arrondissements).

Poland Data: jusuff/PolandGeoJson (Powiaty).

Tech Stack: D3.js, TopoJSON, GeoPandas.

📝 License
MIT License. Feel free to fork and build your own history!
