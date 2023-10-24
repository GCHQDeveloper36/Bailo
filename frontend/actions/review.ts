import qs from 'querystring'
import useSWR from 'swr'
import { ModelInterface, ReleaseInterface } from 'types/types'

import { AccessRequestInterface, ReviewRequestInterface } from '../types/interfaces'
import { ErrorInfo, fetcher } from '../utils/fetcher'

export function useGetReviewRequestsForUser(isActive = true) {
  const { data, error, mutate } = useSWR<
    {
      reviews: ReviewRequestInterface[]
    },
    ErrorInfo
  >(
    `/api/v2/reviews?${qs.stringify({
      active: isActive,
    })}`,
    fetcher,
  )

  return {
    mutateReviews: mutate,
    reviews: data ? data.reviews : [],
    isReviewsLoading: !error && !data,
    isReviewsError: error,
  }
}

type PartialGetReviewRequestsForModelQuery =
  | {
      semver: ReleaseInterface['semver']
      accessRequestId?: never
    }
  | {
      semver?: never
      accessRequestId: AccessRequestInterface['id']
    }

type GetReviewRequestsForModelQuery = {
  modelId: ModelInterface['id']
  isActive: boolean
} & PartialGetReviewRequestsForModelQuery

export function useGetReviewRequestsForModel({
  modelId,
  isActive,
  semver,
  accessRequestId,
}: GetReviewRequestsForModelQuery) {
  const { data, error, mutate } = useSWR<
    {
      reviews: ReviewRequestInterface[]
    },
    ErrorInfo
  >(
    `/api/v2/reviews?${qs.stringify({
      modelId,
      active: isActive,
      ...(semver && { semver }),
      ...(accessRequestId && { accessRequestId }),
    })}`,
    fetcher,
  )

  return {
    mutateReviews: mutate,
    reviews: data ? data.reviews : [],
    isReviewsLoading: !error && !data,
    isReviewsError: error,
  }
}

export async function getReviewCount() {
  return fetch('/api/v2/reviews?active=true', {
    method: 'head',
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function postReviewResponse(
  modelId: string,
  semver: string,
  role: string,
  comment: string,
  decision: string,
) {
  return fetch(`/api/v2/model/${modelId}/release/${semver}/review`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment, decision, role }),
  })
}
