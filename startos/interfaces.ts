import { i18n } from './i18n'
import { sdk } from './sdk'
import { apiHostId, apiPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const origin = await sdk.MultiHost.of(effects, apiHostId).bindPort(apiPort, {
    protocol: 'http',
    preferredExternalPort: apiPort,
  })

  const api = sdk.createInterface(effects, {
    name: i18n('Geocoding API'),
    id: 'api',
    description: i18n(
      'Place search and reverse geocoding for apps and services',
    ),
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  return [await origin.export([api])]
})
