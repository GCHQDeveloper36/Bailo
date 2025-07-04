import bodyParser from 'body-parser'
import { Request, Response } from 'express'
import { z } from 'zod'

import { AuditInfo } from '../../../connectors/audit/Base.js'
import audit from '../../../connectors/audit/index.js'
import { EntryKind, EntryVisibility, ModelInterface } from '../../../models/Model.js'
import { createModel } from '../../../services/model.js'
import { modelInterfaceSchema, registerPath } from '../../../services/specification.js'
import config from '../../../utils/config.js'
import { parse } from '../../../utils/validate.js'

const organisationsList = [...config.ui.modelDetails.organisations, '']
const statesList = [...config.ui.modelDetails.states, '']

export const postModelSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'You must provide a model name').openapi({ example: 'Yolo v4' }),
    kind: z.nativeEnum(EntryKind).openapi({ example: 'model' }),
    organisation: z.enum(organisationsList as [string, ...string[]]).optional(),
    state: z.enum(statesList as [string, ...string[], '']).optional(),
    description: z.string().min(1, 'You must provide a model description').openapi({ example: 'You only look once' }),
    visibility: z.nativeEnum(EntryVisibility).optional().default(EntryVisibility.Public),
    collaborators: z
      .array(
        z.object({
          entity: z.string().openapi({ example: 'user:user' }),
          roles: z.array(z.string()).openapi({ example: ['owner', 'contributor'] }),
        }),
      )
      .optional()
      .default([]),
    settings: z
      .object({
        ungovernedAccess: z.boolean().optional().default(false).openapi({ example: true }),
        allowTemplating: z.boolean().optional().default(false).openapi({ example: true }),
        mirror: z
          .object({
            sourceModelId: z.string().openapi({ example: 'yolo-v4-abcdef' }).optional(),
            destinationModelId: z.string().openapi({ example: 'yolo-v4-abcdef' }).optional(),
          })
          .optional()
          .default({}),
      })
      .optional()
      .default({ ungovernedAccess: false, allowTemplating: false }),
  }),
})

registerPath({
  method: 'post',
  path: '/api/v2/models',
  tags: ['model'],
  description: 'Create a new model instance',
  schema: postModelSchema,
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

interface PostModelResponse {
  model: ModelInterface
}

export const postModel = [
  bodyParser.json(),
  async (req: Request, res: Response<PostModelResponse>): Promise<void> => {
    req.audit = AuditInfo.CreateModel
    const { body } = parse(req, postModelSchema)

    const model = await createModel(req.user, body)

    await audit.onCreateModel(req, model)

    res.json({ model })
  },
]
