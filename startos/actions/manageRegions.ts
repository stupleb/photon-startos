import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { regionChoices } from '../regions'
import { sdk } from '../sdk'
import { defaultLanguages, languageCodes, languageName } from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  regions: Value.multiselect({
    name: i18n('Regions'),
    description: i18n(
      'Each entry is one download, shown with its approximate size. Building the search index needs about six times that in free disk space.',
    ),
    default: [],
    values: regionChoices,
    minLength: 1,
  }),
  languages: Value.multiselect({
    name: i18n('Languages'),
    description: i18n(
      'Place names are always indexed in their local language. Add the languages your apps ask for results in.',
    ),
    default: defaultLanguages(),
    values: Object.fromEntries(
      languageCodes.map((code) => [code, languageName(code)]),
    ),
    minLength: 1,
  }),
})

export const manageRegions = sdk.Action.withInput(
  'manage-regions',
  {
    name: i18n('Manage Regions'),
    description: i18n(
      'Choose the countries Photon can search and the languages it indexes place names in',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },
  inputSpec,
  async () =>
    storeJson
      .read((s) => ({ regions: s.regions, languages: s.languages }))
      .once(),
  async ({ effects, input }) => {
    if (!input.regions.length)
      throw new Error(i18n('Choose at least one region'))
    if (!input.languages.length)
      throw new Error(i18n('Choose at least one language'))
    await storeJson.merge(effects, {
      regions: [...input.regions].sort(),
      languages: [...input.languages].sort(),
    })
    return {
      version: '1',
      title: i18n('Regions Saved'),
      message: i18n(
        'While Photon runs, it downloads and indexes your selection in the background and keeps answering from its current data until the new index is ready. The Map Data health check shows progress.',
      ),
      result: null,
    }
  },
)
