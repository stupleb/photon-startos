import { manageRegions } from '../actions/manageRegions'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const taskRegions = sdk.setupOnInit(async (effects) => {
  const chosen = await storeJson
    .read((s) => s.regions.length > 0)
    .const(effects)
  if (chosen) {
    await sdk.action.clearTask(
      effects,
      `${sdk.manifest.id}:${manageRegions.id}`,
    )
  } else {
    await sdk.action.createOwnTask(effects, manageRegions, 'critical', {
      reason: i18n('Choose the countries Photon can search'),
    })
  }
})
