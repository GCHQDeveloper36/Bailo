import bodyParser from 'body-parser'
import { Request, Response } from 'express'
import { z } from 'zod'

import { UserDoc } from '../../../models/v2/User.js'
import { registerPath, userInterfaceSchema } from '../../../services/v2/specification.js'
import { parse } from '../../../utils/validate.js'

export const getCurrentUserSchema = z.object({})

registerPath({
  method: 'get',
  path: '/api/v2/users/me',
  tags: ['user'],
  description: 'Get the current user',
  schema: getCurrentUserSchema,
  responses: {
    200: {
      description: 'Details about the currently logged in user.',
      content: {
        'application/json': {
          schema: z.object({ model: userInterfaceSchema }),
        },
      },
    },
  },
})

interface GetCurrentUserResponses {
  user: UserDoc
}

export const getCurrentUser = [
  bodyParser.json(),
  async (req: Request, res: Response<GetCurrentUserResponses>) => {
    const _ = parse(req, getCurrentUserSchema)

    return res.json({ user: req.user })
  },
]
