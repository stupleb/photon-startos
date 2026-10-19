import { Builder, isBuilt } from './build'
import { stateJson } from './fileModels/state.json'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { apiPort, photonJar } from './utils'

const mounts = sdk.Mounts.of().mountVolume({
  volumeId: 'main',
  subpath: null,
  mountpoint: '/data',
  readonly: false,
})

export const main = sdk.setupMain(async ({ effects }) => {
  const builder = new Builder(effects)

  return sdk.Daemons.dynamic(effects, async ({ effects: reconcile }) => {
    const want = (await storeJson
      .read((s) => ({
        regions: s.regions,
        languages: s.languages,
        refresh: s.refresh,
      }))
      .const(reconcile)) ?? { regions: [], languages: [], refresh: 0 }
    const built = await stateJson
      .read((s) => ({
        active: s.active,
        regions: s.regions,
        languages: s.languages,
        refresh: s.refresh,
      }))
      .const(reconcile)
    const active = built?.active ?? null

    return sdk.Daemons.of(reconcile)
      .addDaemon('photon', () =>
        active
          ? {
              subcontainer: sdk.SubContainer.of(
                reconcile,
                { imageId: 'photon' },
                mounts,
                'photon',
              ),
              exec: {
                fn: async () => {
                  await builder.prune(active)
                  return {
                    command: [
                      'java',
                      '-Xmx512m',
                      '-XX:+ExitOnOutOfMemoryError',
                      '--enable-native-access=ALL-UNNAMED',
                      '-jar',
                      photonJar,
                      'serve',
                      '-data-dir',
                      `/data/${active}`,
                      '-listen-ip',
                      '0.0.0.0',
                      '-listen-port',
                      String(apiPort),
                    ],
                  }
                },
              },
              uses: active,
              ready: {
                display: i18n('Geocoding API'),
                fn: () =>
                  sdk.healthCheck.checkPortListening(effects, apiPort, {
                    successMessage: i18n('The geocoding API is ready'),
                    errorMessage: i18n('The geocoding API is not ready'),
                  }),
                gracePeriod: 120_000,
              },
              requires: [],
            }
          : null,
      )
      .addOneshot('build', () =>
        want.regions.length && !(built && isBuilt(want, built))
          ? {
              subcontainer: sdk.SubContainer.of(
                reconcile,
                { imageId: 'photon' },
                mounts,
                'build',
              ),
              exec: {
                fn: async (sub, abort) => {
                  await builder.build(sub, abort, want)
                  return null
                },
              },
              uses: want,
              requires: [],
            }
          : null,
      )
      .addHealthCheck('data', {
        ready: {
          display: i18n('Map Data'),
          fn: () => builder.health(),
          trigger: sdk.trigger.statusTrigger(30_000, {
            starting: 1_000,
            loading: 5_000,
          }),
        },
        requires: [],
      })
  })
})
