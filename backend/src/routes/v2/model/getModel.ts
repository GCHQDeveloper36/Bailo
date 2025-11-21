import { Request, Response } from 'express'
import { z } from 'zod'

import { AuditInfo } from '../../../connectors/audit/Base.js'
import audit from '../../../connectors/audit/index.js'
import { getPeerConnector } from '../../../connectors/peer/index.js'
import { EntryKind, EntryKindKeys, ModelInterface } from '../../../models/Model.js'
import { getModelById } from '../../../services/model.js'
import { modelInterfaceSchema, registerPath } from '../../../services/specification.js'
import { parse } from '../../../utils/validate.js'

export const getModelSchema = z.object({
  params: z.object({
    modelId: z.string().openapi({ example: 'yolo-v4-abcdef' }),
  }),
  query: z.object({
    kind: z.string(z.nativeEnum(EntryKind)).optional(),
    peerId: z.string().optional(),
  }),
})

registerPath({
  method: 'get',
  path: '/api/v2/model/{modelId}',
  tags: ['model'],
  description: 'Get a model by its ID',
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

export interface GetModelResponse {
  model: ModelInterface
}

export const getModel = [
  async (req: Request, res: Response<GetModelResponse>): Promise<void> => {
    req.audit = AuditInfo.ViewModel
    const { params, query } = parse(req, getModelSchema)

    let model

    const peerId = query.peerId

    if (peerId) {
      const peerConnector = await getPeerConnector(peerId)
      model = await peerConnector.getEntry(req.user, params.modelId, query.kind as EntryKindKeys | undefined)
    } else {
      model = await getModelById(req.user, params.modelId, query.kind as EntryKindKeys | undefined)
    }

    await audit.onViewModel(req, model)

    res.json({
      model,
    })
  },
]
