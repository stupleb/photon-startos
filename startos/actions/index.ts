import { sdk } from '../sdk'
import { manageRegions } from './manageRegions'
import { refreshData } from './refreshData'

export const actions = sdk.Actions.of()
  .addAction(manageRegions)
  .addAction(refreshData)
