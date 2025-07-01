import bodyParser from 'body-parser'
import { Request, Response } from 'express'
import { z } from 'zod'

import { AuditInfo } from '../../../connectors/audit/Base.js'
import audit from '../../../connectors/audit/index.js'
import { ModelInterface } from '../../../models/Model.js'
import { getRemoteModelById } from '../../../services/model.js'
import { modelInterfaceSchema, registerPath } from '../../../services/specification.js'
import { parse } from '../../../utils/validate.js'

export const getModelSchema = z.object({
  params: z.object({
    peerId: z.string(),
    namespace: z.string(),
    modelId: z.string().openapi({ example: 'yolo-v4-abcdef' }),
  }),
})

registerPath({
  method: 'get',
  path: '/api/v2/model/{peerId}/{namespace}/{modelId}',
  tags: ['model'],
  description: "Get a remote model by it's ID",
  schema: getModelSchema,
  responses: {
    200: {
      description: 'Object with model information.',
      content: {
        'application/json': {
          schema: z.object({ model: modelInterfaceSchema }),
        },
      },
    },
  },
})

interface GetModelResponse {
  model: ModelInterface
}

export const getRemoteModel = [
  bodyParser.json(),
  async (req: Request, res: Response<GetModelResponse>) => {
    req.audit = AuditInfo.ViewModel
    const { params } = parse(req, getModelSchema)

    const model = await getRemoteModelById(req.user, params.namespace, params.modelId, params.peerId)

    await audit.onViewModel(req, model)

    return res.json({
      model,
    })
  },
]
