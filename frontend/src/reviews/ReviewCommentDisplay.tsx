import { Card, Divider, Stack, Typography } from '@mui/material'
import MarkdownDisplay from 'src/common/MarkdownDisplay'
import UserAvatar from 'src/common/UserAvatar'
import UserDisplay from 'src/common/UserDisplay'
import { EntityKind, ResponseInterface } from 'types/types'
import { formatDateString } from 'utils/dateUtils'

type ReviewCommentDisplayProps = {
  response: ResponseInterface
}

export default function ReviewCommentDisplay({ response }: ReviewCommentDisplayProps) {
  const [entityKind, username] = response.user.split(':')

  return (
    <Stack direction='row' spacing={2} alignItems='flex-start'>
      <div style={{ marginTop: 5 }}>
        <UserAvatar entity={{ kind: entityKind as EntityKind, id: username }} size='chip' />
      </div>
      <Card
        sx={{
          width: '100%',
          p: 1,
        }}
      >
        <Stack direction='row' spacing={1} alignItems='center' sx={{ width: '100%' }} justifyContent='space-between'>
          <Typography>
            <UserDisplay dn={username} />
            {' has left a comment'}
          </Typography>
          <Typography fontWeight='bold'>{formatDateString(response.createdAt)}</Typography>
        </Stack>
        {response.comment && (
          <div>
            <Divider sx={{ mt: 1, mb: 2 }} />
            <MarkdownDisplay>{response.comment}</MarkdownDisplay>
          </div>
        )}
      </Card>
    </Stack>
  )
}
