import bodyParser from 'body-parser'
import { Request, Response } from 'express'
import { z } from 'zod'

import { AuditInfo } from '../../../connectors/audit/Base.js'
import audit from '../../../connectors/audit/index.js'
import { Decision } from '../../../models/Response.js'
import { ReviewInterface } from '../../../models/Review.js'
import { respondToReview } from '../../../services/review.js'
import { ReviewKind } from '../../../types/enums.js'
import { parse } from '../../../utils/validate.js'

export const postAccessRequestReviewResponseSchema = z.object({
  params: z.object({
    modelId: z.string(),
    accessRequestId: z.string(),
  }),
  body: z.object({
    role: z.string(),
    comment: z.string().optional(),
    decision: z.nativeEnum(Decision),
  }),
})

interface PostAccessRequestReviewResponse {
  review: ReviewInterface
}

export const postAccessRequestReviewResponse = [
  bodyParser.json(),
  async (req: Request, res: Response<PostAccessRequestReviewResponse>) => {
    req.audit = AuditInfo.CreateReviewResponse
    const {
      params: { modelId, accessRequestId },
      body: { role, ...body },
    } = parse(req, postAccessRequestReviewResponseSchema)

    const review = await respondToReview(req.user, modelId, role, body, ReviewKind.Access, accessRequestId)

    await audit.onCreateReviewResponse(req, review)

    return res.json({
      review,
    })
  },
]
