export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts, interfaces.ts
  'Geocoding API': 0,
  'The geocoding API is ready': 1,
  'The geocoding API is not ready': 2,
  'Map Data': 3,
  'Place search and reverse geocoding for apps and services': 4,

  // build.ts
  'Choose at least one region': 5,
  'Preparing the update': 6,
  'Downloading ${region}: ${done} of ${total}': 7,
  'Indexing places: ${count}': 8,
  'The update failed and Photon is still serving ${regions}. Restart Photon to try again. ${error}': 9,
  'Building the index failed. Restart Photon to try again. ${error}': 10,
  'Waiting to build the index': 11,
  'Serving ${regions}, data from ${date}': 12,
  'Serving ${regions}': 13,
  'Could not reach the download server for ${region}: ${reason}': 14,
  'The download server gave no checksum for ${region}': 15,
  'Not enough free space: the update needs about ${need} and ${free} is free': 16,
  'Could not download ${region}: ${reason}': 17,
  'the download did not match its checksum': 18,
  'Indexing stopped with an error: ${detail}': 19,

  // actions/manageRegions.ts
  Regions: 20,
  'Each entry is one download, shown with its approximate size. Building the search index needs about six times that in free disk space.': 21,
  Languages: 22,
  'Place names are always indexed in their local language. Add the languages your apps ask for results in.': 23,
  'Manage Regions': 24,
  'Choose the countries Photon can search and the languages it indexes place names in': 25,
  'Choose at least one language': 26,
  'Regions Saved': 27,
  'While Photon runs, it downloads and indexes your selection in the background and keeps answering from its current data until the new index is ready. The Map Data health check shows progress.': 28,

  // actions/refreshData.ts
  'Refresh Data': 29,
  'Download the newest map data for your regions and rebuild the search index. GraphHopper publishes new data every week.': 30,
  'Photon downloads every region that has newer data and rebuilds its index, which can take hours for a large country. Searches keep using the current data until the new index is ready.': 31,

  // init/taskRegions.ts
  'Choose the countries Photon can search': 32,

  // regions.ts
  'Central Africa': 33,
  'Northern Africa': 34,
  'Southern Africa': 35,
  'Western Africa': 36,
  'Arabian Peninsula': 37,
  'Central Asia': 38,
  Oceania: 39,
  Caribbean: 40,
  'Central America': 41,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
