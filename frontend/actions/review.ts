import qs from 'querystring'
import useSWR from 'swr'
import {
  AccessRequestInterface,
  DecisionKeys,
  EntryInterface,
  ReleaseInterface,
  ReviewListProps,
  ReviewRequestInterface,
} from 'types/types'

import { ErrorInfo, fetcher } from '../utils/fetcher'

const emptyReviewList = []

export function useGetReviewsSummaryForUser(props?: Partial<ReviewListProps>) {
  const { data, isLoading, error, mutate } = useSWR<
    {
      openReviews: number
    },
    ErrorInfo
  >(
    `/api/v2/reviews/summary?${
      props
        ? qs.stringify({
            ...props,
          })
        : null
    }`,
    fetcher,
  )

  return {
    mutateReviews: mutate,
    openReviews: data ? data.openReviews : null,
    isSummaryLoading: isLoading,
    isSummaryError: error,
  }
}

export function useGetReviewRequestsForUser(props?: Partial<ReviewListProps>) {
  const { data, isLoading, error, mutate } = useSWR<
    {
      reviews: ReviewRequestInterface[]
    },
    ErrorInfo
  >(
    `/api/v2/reviews?${
      props
        ? qs.stringify({
            ...props,
          })
        : null
    }`,
    fetcher,
  )

  return {
    mutateReviews: mutate,
    reviews: data ? data.reviews : emptyReviewList,
    isReviewsLoading: isLoading,
    isReviewsError: error,
  }
}

type SemverOrAccessRequestId =
  | {
      semver: ReleaseInterface['semver']
      accessRequestId?: never
    }
  | {
      semver?: never
      accessRequestId: AccessRequestInterface['id']
    }

type GetReviewRequestsForModelQuery = {
  modelId?: EntryInterface['id']
} & SemverOrAccessRequestId

export function useGetReviewRequestsForModel({ modelId, semver, accessRequestId }: GetReviewRequestsForModelQuery) {
  const { data, isLoading, error, mutate } = useSWR<
    {
      reviews: ReviewRequestInterface[]
    },
    ErrorInfo
  >(
    (modelId && semver) || (modelId && accessRequestId)
      ? `/api/v2/reviews?${qs.stringify({
          mine: false,
          modelId,
          ...(semver && { semver }),
          ...(accessRequestId && { accessRequestId }),
        })}`
      : null,
    fetcher,
  )

  return {
    reviews: data ? data.reviews : [],
    isReviewsLoading: isLoading,
    isReviewsError: error,
    mutateReviews: mutate,
  }
}

type PostReviewResponseParams = {
  modelId: string
  decision: DecisionKeys
  comment: string
  role: string
} & SemverOrAccessRequestId

export async function postReviewResponse({
  modelId,
  role,
  comment,
  decision,
  semver,
  accessRequestId,
}: PostReviewResponseParams) {
  return fetch(
    `/api/v2/model/${modelId}/${semver ? 'release' : 'access-request'}/${semver || accessRequestId}/review`,
    {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment, decision, role }),
    },
  )
}
