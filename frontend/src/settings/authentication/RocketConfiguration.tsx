import { Stack, Typography } from '@mui/material'
import { useGetUiConfig } from 'actions/uiConfig'
import { useMemo, useState } from 'react'
import Loading from 'src/common/Loading'
import SplitButton from 'src/common/SplitButton'
import MessageAlert from 'src/MessageAlert'
import CodeSnippet from 'src/settings/authentication/CodeSnippet'
import { getRktCredentialsConfig } from 'src/settings/authentication/configTemplates'
import TokenCommand from 'src/settings/authentication/TokenCommand'
import { TokenInterface } from 'types/types'
import { HIDDEN_TOKEN_ACCESS_KEY, HIDDEN_TOKEN_SECRET_KEY } from 'utils/constants'
import { downloadFile } from 'utils/fileUtils'
import { toKebabCase } from 'utils/stringUtils'

type RocketConfigurationProps = {
  token: TokenInterface
}

export default function RocketConfiguration({ token }: RocketConfigurationProps) {
  const { uiConfig, isUiConfigLoading, isUiConfigError } = useGetUiConfig()
  const [showFilePreview, setShowFilePreview] = useState(false)
  const [showKeys, setShowKeys] = useState(false)

  const configFileName = useMemo(() => `${toKebabCase(token.description)}-auth.json`, [token.description])

  if (isUiConfigError) {
    return <MessageAlert message={isUiConfigError.info.message} severity='error' />
  }

  if (isUiConfigLoading || !uiConfig) {
    return <Loading />
  }

  return (
    <Stack spacing={4}>
      <Stack spacing={2} alignItems='flex-start'>
        <Typography fontWeight='bold'>Step 1: Download credentials config</Typography>
        <Typography>First, download the rkt credentials file for the personal access token:</Typography>
        <SplitButton
          aria-label='download rocket credentials file'
          options={[`${showFilePreview ? 'Close file preview' : 'Preview file'}`]}
          onPrimaryButtonClick={() =>
            downloadFile(
              getRktCredentialsConfig(uiConfig.registry.host, token.accessKey, token.secretKey),
              configFileName,
            )
          }
          onMenuItemClick={() => setShowFilePreview(!showFilePreview)}
        >
          {`Download ${configFileName}`}
        </SplitButton>
        {showFilePreview && (
          <CodeSnippet
            fileName={configFileName}
            showKeys={showKeys}
            onVisibilityChange={(value) => setShowKeys(value)}
            onClose={() => setShowFilePreview(false)}
          >
            {getRktCredentialsConfig(
              uiConfig.registry.host,
              `${showKeys ? token.accessKey : HIDDEN_TOKEN_ACCESS_KEY}`,
              `${showKeys ? token.secretKey : HIDDEN_TOKEN_SECRET_KEY}`,
            )}
          </CodeSnippet>
        )}
      </Stack>
      <Stack spacing={2} alignItems='flex-start'>
        <Typography fontWeight='bold'>Step 2: Write to disk</Typography>
        <Typography>Second, place the file in the rkt configuration directory:</Typography>
        <TokenCommand disableVisibilityToggle token={token} command={`mv ${configFileName} /etc/rkt/auth.d/`} />
      </Stack>
    </Stack>
  )
}
