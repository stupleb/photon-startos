export const apiPort = 2322
export const apiHostId = 'api'

export const photonJar = '/opt/photon/photon.jar'

const dumpBase = 'https://download1.graphhopper.com/public'
// The dump format Photon 1.x imports.
const dumpLine = '1.0'

export const dumpFile = (id: string) =>
  `photon-dump-${id}-${dumpLine}-latest.jsonl.zst`
export const dumpUrl = (continent: string, id: string) =>
  `${dumpBase}/${continent}/${id}/${dumpFile(id)}`

export const languageCodes = [
  'ar',
  'ca',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'es',
  'fi',
  'fr',
  'he',
  'hu',
  'it',
  'ja',
  'ko',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'sv',
  'tr',
  'uk',
  'zh',
]

export const intlLocale =
  [process.env.LANG?.split('.')[0].replace('_', '-'), 'en-US'].find((l) => {
    try {
      return !!l && !!new Intl.Locale(l)
    } catch {
      return false
    }
  }) ?? 'en-US'

// Photon's own default, plus the server's language.
export const defaultLanguages = () => {
  const own = intlLocale.split('-')[0]
  const base = ['de', 'en', 'fr', 'it']
  return languageCodes.includes(own) && !base.includes(own)
    ? [...base, own].sort()
    : base
}

const regionNames = new Intl.DisplayNames([intlLocale], { type: 'region' })
export const countryName = (code: string) => regionNames.of(code) ?? code

const languageNames = new Intl.DisplayNames([intlLocale], { type: 'language' })
export const languageName = (code: string) => languageNames.of(code) ?? code

export const formatSize = (bytes: number) => {
  const gb = bytes >= 1e9
  return new Intl.NumberFormat(intlLocale, {
    style: 'unit',
    unit: gb ? 'gigabyte' : 'megabyte',
    maximumFractionDigits: gb || bytes < 1e7 ? 1 : 0,
  }).format(bytes / (gb ? 1e9 : 1e6))
}

export const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x))
