'use server'
import { fhubClient } from '../client'
import { Actions } from 'fhub'

export async function action(
  parameters: Actions.User.get.ParametersType,
): Promise<Actions.User.get.ReturnType> {
  return Actions.User.get(fhubClient, parameters)
}
