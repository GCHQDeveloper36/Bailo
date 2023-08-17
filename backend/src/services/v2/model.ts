import authorisation, { ModelAction } from '../../connectors/v2/authorisation/index.js'
import Model, { ModelInterface } from '../../models/v2/Model.js'
import { UserDoc } from '../../models/v2/User.js'
import { toEntity } from '../../utils/v2/entity.js'
import { Forbidden, NotFound } from '../../utils/v2/error.js'
import { convertStringToId } from '../../utils/v2/id.js'

export type CreateModelParams = Pick<ModelInterface, 'name' | 'description' | 'visibility'>
export async function createModel(user: UserDoc, modelParams: CreateModelParams) {
  const modelId = convertStringToId(modelParams.name)

  const model = new Model({
    ...modelParams,
    id: modelId,
    collaborators: [
      {
        entity: toEntity('user', user.dn),
        roles: ['owner'],
      },
    ],
  })

  if (!(await authorisation.userModelAction(user, model, ModelAction.Create))) {
    throw Forbidden(`You do not have permission to create this model.`, { userDn: user.dn })
  }

  await model.save()

  return model
}

export async function getModelById(user: UserDoc, modelId: string) {
  const model = await Model.findOne({
    id: modelId,
  })

  if (!model) {
    throw NotFound(`The requested model was not found.`, { modelId })
  }

  if (!(await authorisation.userModelAction(user, model, ModelAction.View))) {
    throw Forbidden(`You do not have permission to create this model.`, { userDn: user.dn })
  }

  return model
}