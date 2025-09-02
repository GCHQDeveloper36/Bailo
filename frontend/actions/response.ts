import qs from 'querystring'
import useSWR from 'swr'
import { ReactionKindKeys, ResponseInterface } from 'types/types'
import { ErrorInfo, fetcher } from 'utils/fetcher'

const emptyResponseList = []

export function useGetResponses(parentIds: string[]) {
  const queryParams = {
    ...(parentIds.length > 0 && { parentIds }),
  }

  const { data, error, mutate, isLoading } = useSWR<
    {
      responses: ResponseInterface[]
    },
    ErrorInfo
  >(Object.entries(queryParams).length > 0 ? `/api/v2/responses?${qs.stringify(queryParams)}` : null, fetcher)

  return {
    mutateResponses: mutate,
    responses: data ? data.responses : emptyResponseList,
    isResponsesLoading: isLoading,
    isResponsesError: error,
  }
}

export function useGetUserResponses() {
  const { data, error, mutate, isLoading } = useSWR<
    {
      responses: ResponseInterface[]
    },
    ErrorInfo
  >('/api/v2/responses?mine=true', fetcher)

  return {
    mutateResponses: mutate,
    responses: data ? data.responses : emptyResponseList,
    isResponsesLoading: isLoading,
    isResponsesError: error,
  }
}

export function patchResponse(responseId: string, comment: string) {
  return fetch(`/api/v2/response/${responseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  })
}

export async function patchResponseReaction(id: string, kind: ReactionKindKeys) {
  return fetch(`/api/v2/response/${id}/reaction/${kind}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  })
}
