import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.3.0:2',
  releaseNotes: {
    en_US:
      'Large regions now finish indexing, and restarting Photon retries a failed update even while it serves existing data. Building the index needs about 2.5 GB of free memory, which Photon checks before it starts.',
    es_ES:
      'Las regiones grandes ahora terminan de indexarse, y reiniciar Photon reintenta una actualización fallida aunque esté sirviendo datos existentes. Crear el índice necesita unos 2,5 GB de memoria libre, que Photon comprueba antes de empezar.',
    de_DE:
      'Große Regionen werden jetzt vollständig indexiert, und ein Neustart von Photon wiederholt ein fehlgeschlagenes Update auch, während vorhandene Daten bereitgestellt werden. Der Aufbau des Index braucht etwa 2,5 GB freien Arbeitsspeicher, was Photon vor dem Start prüft.',
    pl_PL:
      'Duże regiony są teraz indeksowane do końca, a ponowne uruchomienie Photona powtarza nieudaną aktualizację także wtedy, gdy udostępnia on istniejące dane. Budowa indeksu wymaga około 2,5 GB wolnej pamięci, co Photon sprawdza przed rozpoczęciem.',
    fr_FR:
      'Les grandes régions terminent désormais leur indexation, et redémarrer Photon relance une mise à jour échouée même pendant qu’il sert les données existantes. La construction de l’index nécessite environ 2,5 Go de mémoire libre, ce que Photon vérifie avant de commencer.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
