import ResponseModel from '../models/Response.js'
import { UserInterface } from '../models/User.js'
import { toEntity } from '../utils/entity.js'
import { Forbidden, NotFound } from '../utils/error.js'

export async function findResponseById(responseId: string) {
  const response = await ResponseModel.findOne({
    _id: responseId,
  })

  if (!response) {
    throw NotFound(`The requested response was not found.`, { responseId })
  }

  return response
}

export async function getResponsesByParentIds(_user: UserInterface, parentIds: string[]) {
  const responses = await ResponseModel.find({ parentId: { $in: parentIds } })

  if (!responses) {
    throw NotFound(`The requested response was not found.`, { parentIds })
  }

  return responses
}

export async function findResponsesByIds(_user: UserInterface, responseIds: string[]) {
  const responses = await ResponseModel.find({ _id: { $in: responseIds } })

  if (!responses) {
    throw NotFound(`The requested response was not found.`, { responseIds })
  }

  return responses
}

export async function updateResponse(user: UserInterface, responseId: string, comment: string) {
  const response = await ResponseModel.findOne({ _id: responseId })

  if (!response) {
    throw NotFound(`The requested response was not found.`, { responseId })
  }

  if (response.entity !== toEntity('user', user.dn)) {
    throw Forbidden('Only the original author can update a comment or review response.', {
      userDn: user.dn,
      responseId,
    })
  }

  response.comment = comment
  response.save()

  return response
}
