import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.3.0:1',
  releaseNotes: {
    en_US: 'Updates the StartOS SDK to 3.1.0.',
    es_ES: 'Actualiza el SDK de StartOS a 3.1.0.',
    de_DE: 'Aktualisiert das StartOS-SDK auf 3.1.0.',
    pl_PL: 'Aktualizuje SDK StartOS do wersji 3.1.0.',
    fr_FR: 'Met à jour le SDK StartOS vers la version 3.1.0.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
