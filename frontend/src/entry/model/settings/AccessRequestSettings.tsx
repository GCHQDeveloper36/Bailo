import { Button, Checkbox, Divider, FormControlLabel, Stack, Typography } from '@mui/material'
import { patchModel } from 'actions/model'
import { useState } from 'react'
import useNotification from 'src/hooks/useNotification'
import MessageAlert from 'src/MessageAlert'
import { EntryInterface } from 'types/types'
import { getErrorMessage } from 'utils/fetcher'

type AccessRequestSettingsProps = {
  model: EntryInterface
}

export default function AccessRequestSettings({ model }: AccessRequestSettingsProps) {
  const [allowUngoverned, setAllowUngoverned] = useState(model.settings.ungovernedAccess)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const sendNotification = useNotification()

  async function handleSave() {
    setLoading(true)

    const updatedModelSettings = {
      settings: {
        ungovernedAccess: allowUngoverned,
        allowTemplating: model.settings.allowTemplating,
      },
    }

    const response = await patchModel(model.id, updatedModelSettings)

    if (!response.ok) {
      setErrorMessage(await getErrorMessage(response))
    } else {
      sendNotification({
        variant: 'success',
        msg: 'Access request settings updated',
        anchorOrigin: { horizontal: 'center', vertical: 'bottom' },
      })
    }
    setLoading(false)
  }

  return (
    <Stack spacing={2}>
      <Typography variant='h6' component='h2'>
        Manage access requests
      </Typography>
      <FormControlLabel
        label='Allow users to make ungoverned access requests'
        control={
          <Checkbox
            onChange={(event) => setAllowUngoverned(event.target.checked)}
            checked={allowUngoverned}
            size='small'
          />
        }
      />
      <Divider />
      <div>
        <Button variant='contained' aria-label='Save ungoverned access requests' onClick={handleSave} loading={loading}>
          Save
        </Button>
        <MessageAlert message={errorMessage} severity='error' />
      </div>
    </Stack>
  )
}
