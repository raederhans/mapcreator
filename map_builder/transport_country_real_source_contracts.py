from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_CACHE_ROOT = PROJECT_ROOT / ".runtime" / "source-cache" / "transport"

TARGET_COUNTRY_PACK_IDS = (
    "germany_road",
    "uk_road",
    "france_rail",
    "usa_airport",
    "china_airport",
    "russia_airport",
    "india_airport",
)

FORBIDDEN_COUNTRY_PACK_BACKEND_TOKENS = (
    "checked_in_global_transport",
    "Natural Earth clip",
    "global road clip",
    "global rail clip",
    "global_road",
    "global_rail",
)


@dataclass(frozen=True)
class SourceRequirement:
    id: str
    role: str
    filename: str
    url: str
    license: str
    required_fields: tuple[str, ...] = ()
    filter_rule: str = ""
    notes: str = ""


@dataclass(frozen=True)
class CountrySourceSpec:
    pack_id: str
    family: str
    country: str
    cache_subdir: str
    source_truth: str
    geometry_truth: str
    output_contract: tuple[str, ...]
    sources: tuple[SourceRequirement, ...] = field(default_factory=tuple)


def _source(
    id: str,
    role: str,
    filename: str,
    url: str,
    license: str,
    *,
    required_fields: Iterable[str] = (),
    filter_rule: str = "",
    notes: str = "",
) -> SourceRequirement:
    return SourceRequirement(
        id=id,
        role=role,
        filename=filename,
        url=url,
        license=license,
        required_fields=tuple(required_fields),
        filter_rule=filter_rule,
        notes=notes,
    )


COUNTRY_SOURCE_SPECS: dict[str, CountrySourceSpec] = {
    "germany_road": CountrySourceSpec(
        pack_id="germany_road",
        family="road",
        country="Germany",
        cache_subdir="germany_road",
        source_truth="BKG DLM250 compact road/transport objects",
        geometry_truth="BKG DLM250 compact NAS_BDA or NAS_NBA archive",
        output_contract=("roads.preview.topo.json", "roads.topo.json", "road_labels.preview.geojson", "road_labels.geojson"),
        sources=(
            _source(
                "bkg_dlm250_compact_nas_bda",
                "primary_geometry",
                "dlm250.utm32s.nas_bda.kompakt.zip",
                "https://daten.gdz.bkg.bund.de/produkte/dlm/dlm250/aktuell/dlm250.utm32s.nas_bda.kompakt.zip",
                "Datenlizenz Deutschland Namensnennung 2.0",
                required_fields=("road_object_class", "road_class", "name", "geometry"),
                filter_rule="Map DLM250 road/transport object classes to motorway/trunk/primary; reject non-road objects.",
                notes="BKG direct download is advertised as UTM32s NAS_BDA/NAS_NBA ZIP on the product page.",
            ),
        ),
    ),
    "uk_road": CountrySourceSpec(
        pack_id="uk_road",
        family="road",
        country="United Kingdom",
        cache_subdir="uk_road",
        source_truth="OS Open Roads for Great Britain plus OSNI 50K Transport Lines for Northern Ireland",
        geometry_truth="OS Open Roads GeoPackage/Shapefile and OSNI GeoJSON/Shapefile",
        output_contract=("roads.preview.topo.json", "roads.topo.json", "road_labels.preview.geojson", "road_labels.geojson"),
        sources=(
            _source(
                "os_open_roads_gb",
                "primary_geometry_gb",
                "oproad_essh_gb.zip",
                "https://api.os.uk/downloads/v1/products/OpenRoads/downloads?area=GB&format=ESRI%C2%AE+Shapefile&redirect",
                "OS OpenData / UK Open Government Licence",
                required_fields=("RoadLink", "roadClassification", "roadFunction", "formOfWay", "name1", "geometry"),
                filter_rule="Keep Great Britain motorway, trunk and primary/A-road context features; write source_region=GB.",
            ),
            _source(
                "osni_50k_transport_lines_geojson",
                "primary_geometry_ni",
                "osni_open_data_50k_transport_transport_lines.geojson",
                "https://admin.opendatani.gov.uk/dataset/bdcc2953-ed72-4f21-b012-43cbd5bbc395/resource/d09e7052-6390-4953-92da-ec3479100a7b/download/osni_open_data_50k_transport_transport_lines.geojson",
                "UK Open Government Licence / LPS Open Government Data Licence",
                required_fields=("road_class", "transport_type", "name", "geometry"),
                filter_rule="Keep Northern Ireland motorway and A-class context roads; write source_region=NI.",
            ),
        ),
    ),
    "france_rail": CountrySourceSpec(
        pack_id="france_rail",
        family="rail",
        country="France",
        cache_subdir="france_rail",
        source_truth="SNCF RFN line shapes plus official RFN station dataset",
        geometry_truth="SNCF RFN line shapes; station points from SNCF/transport.data.gouv.fr",
        output_contract=("railways.preview.topo.json", "railways.topo.json", "rail_stations_major.preview.geojson", "rail_stations_major.geojson"),
        sources=(
            _source(
                "sncf_rfn_line_shapes",
                "primary_line_geometry",
                "sncf_rfn_lines_formes-des-lignes-du-rfn_2026-02-19.geojson",
                "https://data.sncf.com/api/explore/v2.1/catalog/datasets/formes-des-lignes-du-rfn/exports/geojson?lang=fr&timezone=Europe%2FParis",
                "ODbL 1.0",
                required_fields=("code_ligne", "mnemo", "libelle", "geometry"),
                filter_rule="Keep EXPLOITE lines in preview; retain full status field in full pack.",
            ),
            _source(
                "sncf_rfn_stations",
                "major_station_scope",
                "sncf_rfn_stations_liste-des-gares_2024-03-28.geojson",
                "https://data.sncf.com/api/explore/v2.1/catalog/datasets/liste-des-gares/exports/geojson?lang=fr&timezone=Europe%2FParis",
                "SNCF Open Data terms / ODbL where mirrored by data.gouv.fr",
                required_fields=("code_uic", "nom", "type", "geometry"),
                filter_rule="Major station selection comes from a repo-versioned override or official passenger/station fields.",
            ),
        ),
    ),
    "usa_airport": CountrySourceSpec(
        pack_id="usa_airport",
        family="airport",
        country="United States",
        cache_subdir="usa_airport",
        source_truth="FAA NASR APT plus FAA passenger boarding/all-cargo statistics",
        geometry_truth="FAA NASR APT coordinates",
        output_contract=("airports.preview.geojson", "airports.geojson"),
        sources=(
            _source(
                "faa_nasr_current",
                "primary_airport_registry_geometry",
                "14_May_2026_APT_CSV.zip",
                "https://nfdc.faa.gov/webContent/28DaySub/extra/14_May_2026_APT_CSV.zip",
                "U.S. federal public data; preserve FAA source notice",
                required_fields=("APT_BASE", "LocId", "IcaoId", "ARPLatitudeS", "ARPLongitudeS"),
                filter_rule="Object scope and coordinates come from NASR APT; exclude closed/private rows by NASR status fields.",
            ),
            _source(
                "faa_passenger_boarding_all_cargo",
                "importance_filter",
                "faa_cy2024_all_enplanements_by_state_airport.xlsx",
                "https://www.faa.gov/airports/planning_capacity/passenger_allcargo_stats/passenger/arp-cy2024-all-enplanements.xlsx",
                "U.S. federal public data; preserve FAA source notice",
                required_fields=("Locid", "CY", "Hub", "Total Enplanements"),
                filter_rule="Preview keeps airports above the agreed enplanement/cargo threshold.",
            ),
        ),
    ),
    "china_airport": CountrySourceSpec(
        pack_id="china_airport",
        family="airport",
        country="China",
        cache_subdir="china_airport",
        source_truth="CAAC annual civil transport airport bulletin plus Taiwan official/open points",
        geometry_truth="Official points where available; OSM/Geofabrik only fills coordinates for official-list airports.",
        output_contract=("airports.preview.geojson", "airports.geojson"),
        sources=(
            _source(
                "caac_2025_airport_bulletin",
                "official_scope_and_importance",
                "caac_2025_airport_throughput_ranking.xlsx",
                "https://www.caac.gov.cn/XXGK/XXGK/TJSJ/202602/P020260226360830390937.xlsx",
                "official_publication_citation_only",
                required_fields=("机场", "旅客吞吐量", "货邮吞吐量", "起降架次"),
                filter_rule="CAAC bulletin decides mainland object scope and importance.",
            ),
            _source(
                "taiwan_caa_airport_page",
                "official_scope_taiwan",
                "tw_airport_caa_airport_telephone_2024-08-08.html",
                "https://www.caa.gov.tw/Article.aspx?a=983&lang=1",
                "Taiwan Open Government Data License 1.0 where applicable",
                required_fields=("機場", "電話", "地址"),
                filter_rule="Taiwan CAA airport telephone table contributes official Taiwan airport scope; OSM only fills coordinates for matched official objects.",
            ),
            _source(
                "osm_airport_geometry_supplement",
                "coordinate_supplement_only",
                "cn_tw_airport_osm_geometry_overpass_2026-05-12.geojson",
                "https://www.openstreetmap.org/copyright",
                "ODbL 1.0",
                required_fields=("aeroway", "name", "iata", "icao", "geometry"),
                filter_rule="Match coordinates only to CAAC/Taiwan official objects; unmatched OSM rows stay out of output.",
            ),
        ),
    ),
    "russia_airport": CountrySourceSpec(
        pack_id="russia_airport",
        family="airport",
        country="Russia",
        cache_subdir="russia_airport",
        source_truth="Rosaviatsiya civil aerodrome/heliport registry",
        geometry_truth="Rosaviatsiya registry if coordinates exist; OSM/Geofabrik only fills coordinates for registered objects.",
        output_contract=("airports.preview.geojson", "airports.geojson"),
        sources=(
            _source(
                "rosaviatsiya_civil_aerodrome_registry",
                "official_scope_registry",
                "ru_airport_rosaviatsiya_civil_aerodrome_registry_2026-04-27.html",
                "https://favt.gov.ru/dejatelnost-ajeroporty-i-ajerodromy-reestr-grajdanskih-ajerodromov-rf/",
                "official_registry_citation_only",
                required_fields=("aerodrome_name", "certificate", "operator", "class", "status"),
                filter_rule="Registry decides object scope; preview uses official class/status and traffic stats when available.",
            ),
            _source(
                "osm_airport_geometry_supplement",
                "coordinate_supplement_only",
                "ru_airport_osm_geometry_overpass_2026-05-12.geojson",
                "https://download.geofabrik.de/russia.html",
                "ODbL 1.0",
                required_fields=("aeroway", "name", "name:ru", "iata", "icao", "geometry"),
                filter_rule="Match coordinates only to Rosaviatsiya registry objects; unmatched OSM rows stay out of output.",
            ),
        ),
    ),
    "india_airport": CountrySourceSpec(
        pack_id="india_airport",
        family="airport",
        country="India",
        cache_subdir="india_airport",
        source_truth="AAI airport list plus AAI traffic report",
        geometry_truth="Official/AAI points where available; OSM/Geofabrik only fills coordinates for AAI-scope airports.",
        output_contract=("airports.preview.geojson", "airports.geojson"),
        sources=(
            _source(
                "aai_airport_list_cluster_wise_2025_26",
                "official_scope_registry",
                "in_airport_aai_operational_airports_2026-05.html",
                "https://www.aai.aero/en/services/list-airports-cluster-wise-f-y-202526",
                "official_reference_citation_only",
                required_fields=("airport_name", "cluster", "region"),
                filter_rule="AAI list decides object scope.",
            ),
            _source(
                "aai_air_traffic_report_june_2025",
                "importance_filter",
                "aai_air_traffic_report_june_2025_TRJun2k25.pdf",
                "https://www.aai.aero/sites/default/files/traffic-news/TRJun2k25.pdf",
                "official_reference_citation_only",
                required_fields=("airport", "passengers", "freight", "aircraft_movements"),
                filter_rule="Preview keeps airports above the agreed traffic threshold.",
            ),
            _source(
                "osm_airport_geometry_supplement",
                "coordinate_supplement_only",
                "in_airport_osm_geometry_overpass_2026-05-12.geojson",
                "https://download.geofabrik.de/asia/india.html",
                "ODbL 1.0",
                required_fields=("aeroway", "name", "iata", "icao", "geometry"),
                filter_rule="Match coordinates only to AAI official objects; unmatched OSM rows stay out of output.",
            ),
        ),
    ),
}


def repo_display_path(path_value: str | Path) -> str:
    path = Path(path_value)
    try:
        return path.resolve().relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def file_signature(path: Path) -> dict[str, Any]:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return {
        "filename": path.name,
        "path": repo_display_path(path),
        "size_bytes": path.stat().st_size,
        "sha256": digest.hexdigest(),
    }


def check_country_sources(
    spec: CountrySourceSpec,
    *,
    source_cache_root: Path = DEFAULT_SOURCE_CACHE_ROOT,
) -> dict[str, Any]:
    cache_dir = source_cache_root / spec.cache_subdir
    sources: list[dict[str, Any]] = []
    missing: list[dict[str, str]] = []
    for source in spec.sources:
        path = cache_dir / source.filename
        record: dict[str, Any] = {
            "id": source.id,
            "role": source.role,
            "expected_path": path.as_posix(),
            "url": source.url,
            "license": source.license,
            "required_fields": list(source.required_fields),
            "filter_rule": source.filter_rule,
            "notes": source.notes,
        }
        if path.is_file():
            record["signature"] = file_signature(path)
        else:
            record["missing"] = True
            missing.append({"id": source.id, "expected_path": path.as_posix(), "url": source.url})
        sources.append(record)
    return {
        "pack_id": spec.pack_id,
        "family": spec.family,
        "country": spec.country,
        "source_truth": spec.source_truth,
        "geometry_truth": spec.geometry_truth,
        "source_cache_dir": cache_dir.as_posix(),
        "sources": sources,
        "missing_sources": missing,
        "ready": not missing,
    }


def build_source_recipe(spec: CountrySourceSpec, check_report: dict[str, Any]) -> dict[str, Any]:
    sanitized_sources = []
    for source in check_report.get("sources", []):
        item = dict(source)
        if "expected_path" in item:
            item["expected_path"] = repo_display_path(item["expected_path"])
        if isinstance(item.get("signature"), dict) and item["signature"].get("path"):
            item["signature"] = dict(item["signature"])
            item["signature"]["path"] = repo_display_path(item["signature"]["path"])
        sanitized_sources.append(item)
    source_signatures = {
        source["id"]: source["signature"]
        for source in check_report.get("sources", [])
        if isinstance(source, dict) and isinstance(source.get("signature"), dict)
    }
    return {
        "version": f"{spec.pack_id}_real_sources_v1",
        "pack_id": spec.pack_id,
        "family": spec.family,
        "country": spec.country,
        "source_policy": "real_source_cache_only",
        "source_cache_dir": repo_display_path(check_report["source_cache_dir"]),
        "source_truth": spec.source_truth,
        "geometry_truth": spec.geometry_truth,
        "sources": sanitized_sources,
        "source_signature": source_signatures,
        "field_mapping_status": "declared_source_requirements_only_until_source_check_is_ready",
        "output_contract": list(spec.output_contract),
    }


def scan_for_forbidden_backend_tokens(paths: Iterable[Path]) -> list[dict[str, str]]:
    offenders: list[dict[str, str]] = []
    for path in paths:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        for token in FORBIDDEN_COUNTRY_PACK_BACKEND_TOKENS:
            if token in text:
                offenders.append({"path": repo_display_path(path), "token": token})
    return offenders
