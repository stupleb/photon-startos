import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const refreshData = sdk.Action.withoutInput(
  'refresh-data',
  {
    name: i18n('Refresh Data'),
    description: i18n(
      'Download the newest map data for your regions and rebuild the search index. GraphHopper publishes new data every week.',
    ),
    warning: i18n(
      'Photon downloads every region that has newer data and rebuilds its index, which can take hours for a large country. Searches keep using the current data until the new index is ready.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },
  async ({ effects }) => storeJson.merge(effects, { refresh: Date.now() }),
)
