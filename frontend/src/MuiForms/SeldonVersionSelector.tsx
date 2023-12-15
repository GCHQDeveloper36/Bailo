import { TextField } from '@mui/material'
import MenuItem from '@mui/material/MenuItem'
import { WidgetProps } from '@rjsf/utils'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import Loading from 'src/common/Loading'
import MessageAlert from 'src/MessageAlert'

import { useGetUiConfig } from '../../data/uiConfig'
import { SeldonVersion } from '../../types/types'

export default function SeldonVersionSelector({ label, value, required, readonly, onChange }: WidgetProps) {
  const { uiConfig, isUiConfigLoading, isUiConfigError } = useGetUiConfig()
  const [seldonVersions, setSeldonVersions] = useState<Array<SeldonVersion>>([])

  useEffect(() => {
    if (uiConfig) setSeldonVersions(uiConfig.seldonVersions)
  }, [uiConfig])

  const options = useMemo(
    () =>
      seldonVersions.map((version: SeldonVersion) => (
        <MenuItem key={`item-${version.name}`} value={version.image}>
          {version.name}
        </MenuItem>
      )),
    [seldonVersions],
  )

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }

  if (readonly) {
    return null
  }

  if (isUiConfigLoading) {
    return <Loading />
  }

  if (isUiConfigError) {
    return <MessageAlert message={isUiConfigError.info.message} />
  }

  return (
    <TextField
      select
      label={`${label}${required ? ' *' : ''}`}
      value={value || ''}
      onChange={handleChange}
      id='seldon-version-select'
    >
      {options}
    </TextField>
  )
}
