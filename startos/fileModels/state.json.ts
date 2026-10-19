import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const dumpShape = z.looseObject({
  md5: z.string().catch(''),
  date: z.string().catch(''),
})

const shape = z.looseObject({
  active: z.string().nullable().catch(null),
  regions: z.array(z.string()).catch([]),
  languages: z.array(z.string()).catch([]),
  refresh: z.number().catch(0),
  dumps: z.record(z.string(), dumpShape).catch({}),
})

export const emptyState = shape.parse({})

export const stateJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'state.json' },
  shape,
)
