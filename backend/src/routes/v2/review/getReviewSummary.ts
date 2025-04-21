import bodyParser from 'body-parser'
import { Request, Response } from 'express'
import { z } from 'zod'

import { AuditInfo } from '../../../connectors/audit/Base.js'
import { countReviews } from '../../../services/review.js'
import { registerPath } from '../../../services/specification.js'
import { ReviewKind } from '../../../types/enums.js'
import { parse, strictCoerceBoolean } from '../../../utils/validate.js'

export const getReviewSummarySchema = z.object({
  query: z.object({
    modelId: z.string().optional(),
    semver: z.string().optional(),
    accessRequestId: z.string().optional(),
    kind: z.nativeEnum(ReviewKind).optional(),
    mine: strictCoerceBoolean(z.boolean().optional().default(true)),
    status: z.string().optional().default('open'),
  }),
})

// reviews.filter(
//             (review) =>
//               !responses.find(
//                 (response) => response.entity === `user:${currentUser.dn}` && response.parentId === review._id,
//               ),
//           ).length,

registerPath({
  method: 'get',
  path: '/api/v2/reviews/summary',
  tags: ['review'],
  description: 'Summarise reviews for the user matching criteria.',
  schema: getReviewSummarySchema,
  responses: {
    200: {
      description: 'A summary of reviews.',
      content: {
        'application/json': {
          schema: z.object({
            openReviews: z.number(),
          }),
        },
      },
    },
  },
})

interface GetReviewSummaryResponse {
  openReviews: number
}

export const getReviewSummary = [
  bodyParser.json(),
  async (req: Request, res: Response<GetReviewSummaryResponse>) => {
    req.audit = AuditInfo.SearchReviews
    const {
      query: { mine, modelId, semver, accessRequestId, kind },
    } = parse(req, getReviewSummarySchema)

    const reviewSummary = await countReviews(req.user, mine, modelId, semver, accessRequestId, kind)
    //await audit.onSearchReviews(req, reviews)

    //res.setHeader('x-count', reviews.length)
    return res.json(reviewSummary)
  },
]
