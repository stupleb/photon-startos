# Updating the upstream version

Upstream is Photon's release jar on GitHub (`komoot/photon`). The `Dockerfile` downloads it by version and pins it by checksum, on an Eclipse Temurin Java runtime pinned by tag.

## Determining the upstream version

```bash
gh release view -R komoot/photon --json tagName,assets --jq '.tagName, (.assets[] | select(.name | endswith(".jar")) | .digest)'
```

That prints the tag and the jar's `sha256:` digest. Read the release notes and `CHANGELOG.md` there for anything that changes the import or the dump format.

## Applying the bump

1. In `Dockerfile`, set `PHOTON_VERSION` to the tag and `--checksum` to the jar's digest.
2. In `startos/versions/current.ts`, set `version` to `<tag>:0` and write the release notes.
3. GraphHopper publishes dumps per Photon dump format, listed as "Photon version" on each region's page under `https://download1.graphhopper.com/public/`. If the new release needs a different format, change `dumpLine` in `startos/utils.ts`; installed indexes then have to be rebuilt, so the version's `up` migration must remove `state.json` from the `main` volume.

The Java runtime moves separately: take the newest `eclipse-temurin` `21.*-jre-noble` tag that carries both amd64 and arm64.

## The region list

`startos/regions.ts` mirrors GraphHopper's region pages (`https://download1.graphhopper.com/public/<continent>/index.html`): each region's download id, its country codes, and its dump size. Regions are added or renamed there rarely; when one is, edit the table to match, and give a region of more than four countries a translated group name.
