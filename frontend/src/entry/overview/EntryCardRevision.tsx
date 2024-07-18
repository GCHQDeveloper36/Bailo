import { TableBody, TableCell, TableRow } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useRouter } from 'next/router'
import EntityDisplay from 'src/common/EntityDisplay'
import { EntityObject, EntryCardRevisionInterface, EntryKindKeys } from 'types/types'
import { formatDateString } from 'utils/dateUtils'

type EntryCardRevisionProps = {
  entryCard: EntryCardRevisionInterface
  entryKind: EntryKindKeys
}

export default function EntryCardRevision({ entryCard, entryKind }: EntryCardRevisionProps) {
  const router = useRouter()
  const theme = useTheme()

  return (
    <TableBody>
      <TableRow
        hover
        onClick={() => router.push(`/${entryKind}/${entryCard.modelId}/history/${entryCard.version}`)}
        sx={{ '&:hover': { cursor: 'pointer' } }}
      >
        <TableCell sx={{ color: theme.palette.secondary.main }}>{entryCard.version}</TableCell>
        <TableCell sx={{ color: theme.palette.primary.main }}>
          <EntityDisplay entity={new EntityObject('user', entryCard.createdBy)} />
        </TableCell>
        <TableCell sx={{ color: theme.palette.primary.main }}>{formatDateString(entryCard.createdAt)}</TableCell>
      </TableRow>
    </TableBody>
  )
}
