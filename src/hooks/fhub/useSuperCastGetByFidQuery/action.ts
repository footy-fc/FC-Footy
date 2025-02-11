'use server'
import { fhubClient } from '../client'
import { Actions } from 'fhub'

export async function action(
  parameters: Actions.SuperCast.getByFid.ParametersType,
): Promise<Actions.SuperCast.getByFid.ReturnType> {
  return Actions.SuperCast.getByFid(fhubClient, parameters)
}
