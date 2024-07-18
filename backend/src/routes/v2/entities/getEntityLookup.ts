import bodyParser from 'body-parser'
import { Request, Response } from 'express'
import { z } from 'zod'

import { EntityInformation as EntityInformation } from '../../../connectors/authentication/Base.js'
import authentication from '../../../connectors/authentication/index.js'
import { EntityInformationSchema, registerPath } from '../../../services/specification.js'
import { parse } from '../../../utils/validate.js'

export const getEntityLookupSchema = z.object({
  params: z.object({
    entity: z.string(),
  }),
})

registerPath({
  method: 'get',
  path: '/api/v2/entity/{entity}/lookup',
  tags: ['user'],
  description: 'Get information about an entity',
  schema: getEntityLookupSchema,
  responses: {
    200: {
      description: 'Information about the provided entity.',
      content: {
        'application/json': {
          schema: z.object({ entity: EntityInformationSchema }),
        },
      },
    },
  },
})

interface GetEntityLookup {
  entity: EntityInformation
}

export const getEntityLookup = [
  bodyParser.json(),
  async (req: Request, res: Response<GetEntityLookup>) => {
    const {
      params: { entity },
    } = parse(req, getEntityLookupSchema)

    const information = await authentication.getEntityInformation(entity)

    return res.json({ entity: information })
  },
]
