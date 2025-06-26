import { DialogContent, DialogTitle } from '@mui/material'
import Dialog from '@mui/material/Dialog'
import { Transition } from 'src/common/Transition'
import EntryRoleList from 'src/entry/overview/EntryRoleList'
import { EntryInterface } from 'types/types'

type EntryRolesDialogProps = {
  entry: EntryInterface
  open: boolean
  onClose: () => void
}

export default function EntryRolesDialog({ entry, open, onClose }: EntryRolesDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='lg' TransitionComponent={Transition}>
      <DialogTitle>Roles</DialogTitle>
      <DialogContent>
        <EntryRoleList entry={entry} />
      </DialogContent>
    </Dialog>
  )
}
