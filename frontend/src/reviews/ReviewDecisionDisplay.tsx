import { Undo } from '@mui/icons-material'
import Done from '@mui/icons-material/Done'
import HourglassEmpty from '@mui/icons-material/HourglassEmpty'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import { Box, Card, Divider, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useGetModelRoles } from 'actions/model'
import { patchResponse } from 'actions/response'
import { useState } from 'react'
import EntityDisplay from 'src/common/EntityDisplay'
import Loading from 'src/common/Loading'
import UserAvatar from 'src/common/UserAvatar'
import MessageAlert from 'src/MessageAlert'
import EditableReviewComment from 'src/reviews/EditableReviewComment'
import { Decision, EntityKind, EntityObject, ResponseInterface } from 'types/types'
import { formatDateString } from 'utils/dateUtils'
import { getErrorMessage } from 'utils/fetcher'
import { getRoleDisplay } from 'utils/roles'

type ReviewDecisionDisplayProps = {
  response: ResponseInterface
  modelId: string
  onReplyButtonClick: (value: string) => void
  currentUser: User | undefined
  mutateResponses: () => void
}

export default function ReviewDecisionDisplay({
  response,
  modelId,
  onReplyButtonClick,
  currentUser,
  mutateResponses,
}: ReviewDecisionDisplayProps) {
  const { modelRoles, isModelRolesLoading, isModelRolesError } = useGetModelRoles(modelId)

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [comment, setComment] = useState(response.comment || '')
  const [editCommentErrorMessage, setEditCommentErrorMessage] = useState('')
  const open = Boolean(anchorEl)

  const theme = useTheme()
  const [entityKind, username] = response.entity.split(':')

  const handleReplyOnClick = (value: string | undefined) => {
    setAnchorEl(null)
    if (value) {
      onReplyButtonClick(value.replace(/^/gm, '>'))
    }
  }

  const handleEditOnClick = () => {
    setIsEditMode(true)
  }

  const handleEditOnCancel = () => {
    setIsEditMode(false)
    setEditCommentErrorMessage('')
    setComment(response.comment || '')
  }

  const handleEditOnSave = async () => {
    setEditCommentErrorMessage('')
    const res = await patchResponse(response._id, comment)
    if (!res.ok) {
      setEditCommentErrorMessage(await getErrorMessage(res))
    } else {
      mutateResponses()
      setIsEditMode(false)
    }
  }

  if (isModelRolesError) {
    return <MessageAlert message={isModelRolesError.info.message} severity='error' />
  }

  return (
    <>
      {isModelRolesLoading && <Loading />}
      <Stack direction='row' spacing={2} alignItems='flex-start'>
        <Box mt={1}>
          <UserAvatar entity={{ kind: entityKind as EntityKind, id: username }} size='chip' />
        </Box>
        <Card
          sx={{
            width: '100%',
            p: 1,
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems='center'
            sx={{ width: '100%' }}
            justifyContent='space-between'
          >
            <Stack alignItems={{ xs: 'center', sm: 'flex-start' }} spacing={{ xs: 1, sm: 0 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems='center'>
                <Typography data-test='reviewDecisionDisplay'>
                  <EntityDisplay entity={new EntityObject('user', username)} />
                  {response.decision === Decision.Approve && ' has approved'}
                  {response.decision === Decision.RequestChanges && ' has requested changes'}
                  {response.decision === Decision.Undo && ' has undone their review'}
                </Typography>
                {response.decision === Decision.Approve && <Done color='success' fontSize='small' />}
                {response.decision === Decision.RequestChanges && <HourglassEmpty color='warning' fontSize='small' />}
                {response.decision === Decision.Undo && <Undo fontSize='small' />}
                {response.outdated && (
                  <Typography sx={{ backgroundColor: theme.palette.warning.light, borderRadius: 1, px: 0.5 }}>
                    Outdated
                  </Typography>
                )}
              </Stack>
              {response.role && (
                <Typography variant='caption'>as {getRoleDisplay(response.role, modelRoles)}</Typography>
              )}
            </Stack>
            <Stack direction='row' alignItems='center' spacing={1}>
              <Typography fontWeight='bold'>{formatDateString(response.createdAt)}</Typography>
              <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} aria-label='Actions'>
                <MoreHorizIcon />
              </IconButton>
            </Stack>
          </Stack>
          <Divider sx={{ mt: 1, mb: 2 }} />
          <EditableReviewComment
            comment={comment}
            onCommentChange={setComment}
            response={response}
            isEditMode={isEditMode}
            editCommentErrorMessage={editCommentErrorMessage}
            onSave={handleEditOnSave}
            onCancel={handleEditOnCancel}
          />
        </Card>
      </Stack>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => handleReplyOnClick(comment)}>Reply</MenuItem>
        {currentUser && currentUser.dn === username && <MenuItem onClick={handleEditOnClick}>Edit comment</MenuItem>}
      </Menu>
    </>
  )
}
