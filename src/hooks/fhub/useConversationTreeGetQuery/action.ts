'use server'
import { fhubClient } from '../client'
import { Actions } from 'fhub'

export async function action(
  parameters: Actions.ConversationTree.get.ParametersType,
): Promise<Actions.ConversationTree.get.ReturnType> {
  return Actions.ConversationTree.get(fhubClient, parameters)
}
