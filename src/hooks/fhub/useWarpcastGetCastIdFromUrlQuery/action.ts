'use server'
import { fhubClient } from '../client'
import { Actions } from 'fhub'

export async function action(
  parameters: Actions.Warpcast.getCastIdFromUrl.ParametersType,
): Promise<Actions.Warpcast.getCastIdFromUrl.ReturnType> {
  return Actions.Warpcast.getCastIdFromUrl(fhubClient, parameters)
}
