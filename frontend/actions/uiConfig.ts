import useSWRImmutable from 'swr/immutable'

import { UiConfig } from '../types/types'
import { ErrorInfo, fetcher } from '../utils/fetcher'

export function useGetUiConfig() {
  const { data, error, mutate } = useSWRImmutable<
    {
      uiConfig: UiConfig
    },
    ErrorInfo
  >('/api/v2/config/ui', fetcher)

  return {
    mutateUiConfig: mutate,
    uiConfig: data?.uiConfig,
    isUiConfigLoading: !error && !data,
    isUiConfigError: error,
  }
}
