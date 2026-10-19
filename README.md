<p align="center">
  <img src="icon.png" alt="Photon Logo" width="21%">
</p>

# Photon on StartOS

> Everything not listed in this document should behave the same as upstream
> Photon. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation section of
> `instructions.md` for links.

[Photon](https://github.com/komoot/photon) is komoot's geocoder for OpenStreetMap data: place search as you type, and reverse geocoding from coordinates to addresses. This package serves it for the countries the user selects, building the search index on the server from GraphHopper's per-region data dumps.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Upstream publishes a jar rather than an image, so the package builds its own: the Eclipse Temurin Java runtime on Ubuntu, `zstd`, and Photon's release jar at `/opt/photon/photon.jar`, fetched with a pinned checksum. It is built for x86_64 and aarch64. The image has no entrypoint of its own that the package uses; every command is given explicitly.

| Subcontainer | Runs                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `photon`     | `java -jar photon.jar serve` on the active index, listening on `0.0.0.0:2322`. Exists only once an index is built |
| `build`      | `zstd` and `java -jar photon.jar import` while an index is being built. Exists only during a build                |

Each Java process starts Photon's embedded OpenSearch node on loopback ports from 9201 and 9300 upwards; a build and the server run side by side, each on its own ports. Downloads are made by the package's own code in the StartOS service runtime, not inside a subcontainer.

## Volume and Data Layout

Two volumes: `main` holds everything Photon needs and can be rebuilt; `startos` holds the user's choices.

| Volume    | Mounted at                    | Contents                                                                                                                                                                                     |
| --------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main`    | `/data` in both subcontainers | `dumps/` (one GraphHopper dump per selected region, plus a `.part` file while one downloads), `index-<timestamp>/photon_data` (the live index, and a second one while a build runs), `state.json` |
| `startos` | not mounted                   | `store.json`                                                                                                                                                                                 |

Every build first checks each cached dump against the MD5 it was downloaded with, and downloads a damaged one again. A build writes its index into a new `index-<timestamp>` directory. The previous index is deleted when the server starts on the new one; an abandoned build's directory is deleted when the next build or server start runs.

## File Models

The package keeps two JSON files and writes no Photon configuration; Photon's settings are command-line flags fixed by the package.

**`store.json`** (`startos` volume): `regions` (GraphHopper region ids), `languages` (language codes passed to the import's `-languages`), and `refresh` (a timestamp). Seeded at install with no regions and Photon's default languages plus the server's own language when it is one of the offered languages. **Manage Regions** rewrites `regions` and `languages`; **Refresh Data** rewrites `refresh`. A hand edit survives and has the same effect as the action: any difference from what the live index was built from starts a build.

**`state.json`** (`main` volume): what the live index is. `active` (its directory), the `regions`, `languages` and `refresh` it was built from, and `dumps` (each cached dump's MD5 and its download's `Last-Modified` date). Only the build writes it. Don't edit it: a wrong `active` points the server at a missing index. Deleting it makes the next start rebuild from scratch, downloading every region again.

## Dependencies

None.

## Network Access and Interfaces

One interface, plus outbound downloads.

| Interface id | Type  | Port | Protocol | Purpose                                                                |
| ------------ | ----- | ---- | -------- | ---------------------------------------------------------------------- |
| `api`        | `api` | 2322 | HTTP     | Photon's JSON API: `/api`, `/reverse`, `/structured`, `/status`. No UI |

Another package reaches Photon over the host bridge through host id `api` and internal port 2322, both exported from `startos/utils.ts` as `apiHostId` and `apiPort`. The API has no authentication. Builds download from `https://download1.graphhopper.com/public` over HTTPS.

## Installation and First-Run Flow

Install raises the **Manage Regions** task, which blocks starting until at least one region is chosen. On the first start the `build` oneshot downloads the chosen regions and builds the index; the `photon` daemon doesn't exist and nothing answers on the `api` interface until that finishes, and the **Map Data** check shows the progress. A small country takes minutes; one the size of France or Germany takes around an hour, and most of that is the import.

## Actions

Both actions only write `store.json`; the running service reacts by starting a build in the background, without restarting the server.

**Manage Regions** — choose regions and name languages.

- When: before first start (its task), and to add or remove a country.
- Changes: `store.json` `regions` and `languages`. Saving the selection the index already has does nothing.
- Cost: downloads only regions not cached, then re-imports every selected region into a new index. The import time follows the total size of the selection, not the size of the change. While it runs, a second Java process works beside the server.
- Repeat safety: saving a different selection during a build cancels that build and starts one for the new selection. Cached downloads are kept, and a partial download resumes.
- Next: when the new index is ready, the `photon` daemon restarts on it and the old index is deleted. Searches fail while it starts: 15–25 seconds for small countries on a four-core test server.

**Refresh Data** — take GraphHopper's weekly updates.

- When: whenever the user wants newer map data.
- Changes: `store.json` `refresh`. The build fetches each selected region's published MD5, downloads those that differ from the cached ones, and rebuilds only if one did; otherwise it records the refresh and keeps the index.
- Cost: as Manage Regions, when anything changed; a few small requests when nothing did.
- Repeat safety: safe; running it during a build restarts the build, which then re-checks every region.

## Tasks

One task.

- **Manage Regions** (`critical`). Raised while `store.json` has no regions: at install, or after restoring a backup taken before any region was chosen. Running the action with at least one region clears it, and it does not return, because the action refuses an empty selection.

## Health Checks

Two checks; the first exists only once an index has been built.

**Geocoding API** (`photon`): port 2322 listening, with a 120-second grace period while the embedded OpenSearch node opens the index. A failure after that means the Java process exited, for example on running out of memory (`-XX:+ExitOnOutOfMemoryError`); the daemon restarts on its own, and the logs say why it stopped.

**Map Data** (`data`):

- Loading, with progress: preparing, downloading (region, bytes done of total), or indexing (places imported so far). The API keeps answering from the previous index meanwhile.
- Success: the regions being served and the date of the oldest cached dump.
- Failure: the last build failed, with the reason. Photon keeps serving the previous index, if it had one. Builds are not retried automatically; restarting the service, running Refresh Data, or saving a different selection starts a new build. Reasons:
  - The download server can't be reached, or a download still fails after three attempts.
  - A download doesn't match its published MD5.
  - Free space is short. A build needs room for its downloads plus six times the total dump size of the selection, beside the existing index.
  - The import exits with an error, for example out of memory. The message quotes Photon's last error line.

An import's log can show `Bulk rejected (429); retrying … (attempt 1/8)`: the embedded OpenSearch node pushing back on a batch under the import's 1 GB heap. Photon retries the batch itself, and the import fails only if one batch is refused eight times.

## Backups and Restore

The backup copies the `startos` volume only, so it holds the region and language selection. `main` is excluded: its dumps can be downloaded again and its index rebuilt from them, and together they can run to tens of gigabytes. A restored Photon therefore starts with no index and runs a full build of its selection, which takes as long as the first install's.

## Limitations and Differences

1. Data comes only from GraphHopper's per-region dumps. Importing from a Nominatim database, continuous updates (`update`, `/nominatim-update`) and Photon's prebuilt database downloads are not used.
2. Only GraphHopper's country-level regions are offered, not continents or the planet. Some regions are groups (the Caribbean, Central America, the Baltics, and others), downloaded as one file.
3. Every change rebuilds the whole index from all selected regions; Photon cannot add a region to an existing index.
4. The import takes Photon's defaults apart from `-languages`: no `-extra-tags`, `-full-geometries`, `-reverse-only`, country filtering or custom normalisation.
5. The server takes Photon's defaults: no CORS, no metrics endpoint, no synonyms, no update API.
6. The Java heaps are fixed, with no setting: 512 MB for the server and 1 GB for an import, which run to about 0.5 GB and 1.4 GB of memory. A build runs its import beside the server.
7. Places outside the selected regions are not found, and a reverse lookup there returns no result.

---

## Quick Reference for AI Consumers

```yaml
package_id: photon
image: eclipse-temurin + photon jar (built from Dockerfile)
architectures: [x86_64, aarch64]
subcontainers: [photon, build]
volumes:
  main: /data
  startos: not mounted
file_models:
  - startos/store.json
  - main/state.json
startos_managed_env_vars: []
dependencies: none
interfaces:
  api: { type: api, port: 2322 }
actions:
  - manage-regions
  - refresh-data
tasks:
  - { action: manage-regions, severity: critical }
health_checks:
  - photon
  - data
```
