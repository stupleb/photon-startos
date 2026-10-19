import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { defaultLanguages } from '../utils'

const shape = z.looseObject({
  regions: z.array(z.string()).catch([]),
  languages: z.array(z.string()).catch(() => defaultLanguages()),
  refresh: z.number().catch(0),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  shape,
)
