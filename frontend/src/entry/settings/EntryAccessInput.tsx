import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useListUsers } from 'actions/user'
import { debounce } from 'lodash-es'
import { SyntheticEvent, useCallback, useEffect, useMemo, useState } from 'react'
import EntityItem from 'src/entry/settings/EntityItem'
import MessageAlert from 'src/MessageAlert'
import { CollaboratorEntry, EntityKind, EntityObject, EntryKindKeys, Role } from 'types/types'
import { toSentenceCase } from 'utils/stringUtils'

type EntryAccessInputProps = {
  value: CollaboratorEntry[]
  onUpdate: (list: CollaboratorEntry[]) => void
  entryKind: EntryKindKeys
  entryRoles: Role[]
} & (
  | {
      isReadOnly: boolean
      requiredRolesText: string
    }
  | {
      isReadOnly?: never
      requiredRolesText?: never
    }
)

export default function EntryAccessInput({ value, onUpdate, entryKind, entryRoles }: EntryAccessInputProps) {
  const [open, setOpen] = useState(false)
  const [accessList, setAccessList] = useState<CollaboratorEntry[]>(value)
  const [userListQuery, setUserListQuery] = useState('')
  const [manualEntityKind, setManualEntityKind] = useState<EntityKind>(EntityKind.USER)
  const [manualEntityName, setManualEntityName] = useState('')

  const { users, isUsersLoading, isUsersError } = useListUsers(userListQuery)

  const accessListEntities = useMemo(
    () =>
      accessList.map((entity) => (
        <EntityItem
          key={entity.entity}
          entity={entity}
          accessList={accessList}
          onAccessListChange={setAccessList}
          entryRoles={entryRoles}
          entryKind={entryKind}
        />
      )),
    [accessList, entryKind, entryRoles],
  )

  useEffect(() => {
    if (value) {
      setAccessList(value)
    }
  }, [value])

  useEffect(() => {
    onUpdate(accessList)
  }, [accessList, onUpdate])

  const onUserChange = useCallback(
    (_event: SyntheticEvent<Element, Event>, newValue: EntityObject | null) => {
      if (newValue && !accessList.find(({ entity }) => entity === `${newValue.kind}:${newValue.id}`)) {
        const updatedAccessList = [...accessList]
        const newAccess = { entity: `${newValue.kind}:${newValue.id}`, roles: [] }
        updatedAccessList.push(newAccess)
        setAccessList(updatedAccessList)
      }
    },
    [accessList],
  )

  const handleInputChange = useCallback((_event: SyntheticEvent<Element, Event>, value: string) => {
    setUserListQuery(value)
  }, [])

  const debounceOnInputChange = debounce((event: SyntheticEvent<Element, Event>, value: string) => {
    handleInputChange(event, value)
  }, 500)

  const noOptionsText = useMemo(() => {
    if (userListQuery.length < 3) return 'Please enter at least three characters'
    if (isUsersError?.status === 413) return 'Too many results, please refine your search'
    return 'No options'
  }, [userListQuery, isUsersError])

  if (isUsersError && isUsersError.status !== 413) {
    return <MessageAlert message={isUsersError.info.message} severity='error' />
  }

  return (
    <Stack spacing={2}>
      <Autocomplete
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        size='small'
        noOptionsText={noOptionsText}
        onInputChange={debounceOnInputChange}
        groupBy={(option) => option.kind.toUpperCase()}
        getOptionLabel={(option) => option.id}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        onChange={onUserChange}
        options={users}
        filterOptions={(options) =>
          options.filter(
            (option) => !accessList.find((collaborator) => collaborator.entity === `${option.kind}:${option.id}`),
          )
        }
        loading={isUsersLoading && userListQuery.length >= 3}
        renderInput={(params) => (
          <TextField
            {...params}
            autoFocus
            label={`Add a user or group to the ${toSentenceCase(entryKind)} access list`}
          />
        )}
      />
      <Accordion sx={{ borderTop: 'none' }}>
        <AccordionSummary
          sx={{ pl: 0, borderTop: 'none' }}
          expandIcon={<ExpandMoreIcon />}
          aria-controls='manual-user-add-content'
          id='manual-user-add-header'
        >
          <Typography component='caption'>Trouble finding user / group?</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <FormControl sx={{ width: '150px' }}>
              <InputLabel id='manual-entity-kind-select'>User or group</InputLabel>
              <Select
                id='manual-entity-kind-select'
                value={manualEntityKind}
                label='User or group'
                size='small'
                onChange={(e) => setManualEntityKind(e.target.value as EntityKind)}
              >
                <MenuItem value={'user'}>User</MenuItem>
                <MenuItem value={'group'}>Group</MenuItem>
              </Select>
            </FormControl>
            <TextField
              id='manual-entity-name-select'
              placeholder='Joe Bloggs'
              size='small'
              fullWidth
              label='User or group name'
              value={manualEntityName}
              onChange={(e) => setManualEntityName(e.target.value)}
            />
            <Button variant='contained'>Add</Button>
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Entity</TableCell>
            <TableCell>Roles</TableCell>
            <TableCell align='right'>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{accessListEntities}</TableBody>
      </Table>
    </Stack>
  )
}
