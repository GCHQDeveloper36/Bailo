import { Button, Stack, Typography } from '@mui/material'
import MarkdownDisplay from 'src/common/MarkdownDisplay'
import RichTextEditor from 'src/common/RichTextEditor'
import MessageAlert from 'src/MessageAlert'
import { ResponseInterface } from 'types/types'
import { formatDateTimeString } from 'utils/dateUtils'

interface EditableReviewCommentProps {
  comment: string
  onCommentChange: (value: string) => void
  response: ResponseInterface
  isEditMode: boolean
  editCommentErrorMessage: string
  onCancel: () => void
  onSave: () => void
}

export default function EditableReviewComment({
  comment,
  onCommentChange,
  response,
  isEditMode,
  editCommentErrorMessage,
  onCancel,
  onSave,
}: EditableReviewCommentProps) {
  return (
    <>
      {!isEditMode && (
        <Stack spacing={2}>
          <MarkdownDisplay>{comment}</MarkdownDisplay>
          {response.updatedAt !== response.createdAt && (
            <Typography variant='caption' sx={{ fontStyle: 'italic' }}>
              Edited {formatDateTimeString(response.updatedAt)}
            </Typography>
          )}
        </Stack>
      )}
      {isEditMode && (
        <>
          <RichTextEditor value={comment} onChange={(input) => onCommentChange(input)} />
          <Stack sx={{ textAlign: 'right', pt: 2 }} direction='row' spacing={1} justifyContent='right'>
            <Button onClick={onCancel}>Cancel</Button>
            <Button variant='contained' onClick={onSave}>
              Save
            </Button>
          </Stack>
          <MessageAlert message={editCommentErrorMessage} />
        </>
      )}
    </>
  )
}
