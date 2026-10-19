import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'photon',
  title: 'Photon',
  license: 'Apache-2.0',
  packageRepo: 'https://github.com/stupleb/photon-startos',
  upstreamRepo: 'https://github.com/komoot/photon',
  marketingUrl: 'https://photon.komoot.io',
  donationUrl: null,
  description: { short, long },
  volumes: ['startos', 'main'],
  images: {
    photon: {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
