# Photon

## Documentation

- [Photon API](https://github.com/komoot/photon/blob/master/docs/api-v1.md) — every search and reverse-geocoding parameter, with example responses

## What you get on StartOS

Photon gives your server its own geocoder. Apps and services can search for places and addresses, and turn coordinates into addresses, without sending your locations to a public service. It covers only the countries you choose, which keeps it small enough for a home server: Photon downloads ready-made data for those countries from GraphHopper and builds its search index on your server.

The **Geocoding API** interface is the address your apps use. It has no web page of its own, so opening it in a browser only shows an error message.

## Getting set up

1. Run **Manage Regions** when Photon asks for it. Choose the countries you need, and the languages your apps ask for results in. Each country shows its download size; building needs about six times that in free disk space.
2. Start Photon. The **Map Data** health check shows the download and indexing progress. A small country is ready in minutes; a large one, such as France or Germany, takes around an hour.
3. When **Map Data** shows the countries it is serving, copy the **Geocoding API** address into the app that should use Photon.

## Using Photon

### Adding or removing countries

Run **Manage Regions** whenever you need another country, for example before a trip. Photon downloads only what it doesn't have yet, then builds a new index from all your countries in the background. Searches keep working on the current data until the new index is ready, then switch over after a short pause while Photon restarts.

Every change rebuilds the whole index, so adding a small country next to a large one still takes as long as indexing the large one.

### Keeping the data current

GraphHopper publishes new data every week. Run **Refresh Data** to download the newer data for your countries and rebuild the index. If nothing has changed since your last download, Photon keeps its current index.

### If an update fails

**Map Data** turns red and says why, for example a download that failed or too little free disk space. Photon keeps answering from the data it had. Fix the cause if there is one, then restart Photon to try again.

### Connecting apps

Point an app at the **Geocoding API** address. Photon answers place searches at `/api` and reverse geocoding at `/reverse`; the API documentation above lists the parameters. Photon only knows the countries you chose, so a search for a place outside them finds nothing.
