import ClearIcon from '@mui/icons-material/Clear'
import GroupsIcon from '@mui/icons-material/Groups'
import PersonIcon from '@mui/icons-material/Person'
import { Autocomplete, Chip, IconButton, Stack, TableCell, TableRow, TextField, Tooltip } from '@mui/material'
import _ from 'lodash-es'
import { SyntheticEvent, useMemo } from 'react'
import EntityDisplay from 'src/common/EntityDisplay'
import { CollaboratorEntry, Role } from 'types/types'
import { fromEntity } from 'utils/entityUtils'
import { toSentenceCase } from 'utils/stringUtils'

type EntityItemProps = {
  entity: CollaboratorEntry
  accessList: CollaboratorEntry[]
  onAccessListChange: (value: CollaboratorEntry[]) => void
  entryKind: string
  entryRoles: Role[]
  isReadOnly: boolean
  requiredRolesText: string
}

export default function EntityItem({
  entity,
  accessList,
  onAccessListChange,
  entryKind,
  entryRoles,
  isReadOnly,
  requiredRolesText,
}: EntityItemProps) {
  const entryRoleOptions = useMemo(() => entryRoles.map((role) => role.id), [entryRoles])

  function onRoleChange(_event: SyntheticEvent<Element, Event>, newValues: string[]) {
    const updatedAccessList = _.cloneDeep(accessList)
    const index = updatedAccessList.findIndex((access) => access.entity === entity.entity)
    updatedAccessList[index].roles = newValues
    onAccessListChange(updatedAccessList)
  }

  function removeEntity() {
    onAccessListChange(accessList.filter((access) => access.entity !== entity.entity))
  }

  function getRole(roleId: string) {
    const role = entryRoles.find((role) => role.id === roleId)
    if (!role) return { id: roleId, name: 'Unknown Role' }

    return role
  }

  return (
    <TableRow>
      <TableCell>
        <Stack direction='row' alignItems='center' spacing={1}>
          <EntityIcon entity={entity} />
          <EntityNameDisplay entity={entity} />
        </Stack>
      </TableCell>
      <TableCell>
        {entryRoles.length > 0 && (
          <Tooltip title={requiredRolesText}>
            <Autocomplete
              multiple
              disabled={isReadOnly}
              size='small'
              aria-label={`role selector input for entity ${entity.entity}`}
              value={entity.roles}
              data-test='accessListAutocomplete'
              options={entryRoleOptions}
              getOptionLabel={(role) => getRole(role).name}
              onChange={onRoleChange}
              renderInput={(params) => <TextField {...params} label='Select roles' />}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={getRole(option).name} {...getTagProps({ index })} key={option} />
                ))
              }
            />
          </Tooltip>
        )}
      </TableCell>
      <TableCell align='right'>
        <Tooltip title={isReadOnly ? requiredRolesText : 'Remove user'}>
          <span>
            <IconButton
              aria-label={`Remove user ${entity.entity} from ${toSentenceCase(entryKind)} access list`}
              disabled={isReadOnly}
              onClick={removeEntity}
              data-test='accessListRemoveUser'
            >
              <ClearIcon color={isReadOnly ? 'disabled' : 'secondary'} fontSize='inherit' />
            </IconButton>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  )
}

type EntityIconProps = {
  entity: CollaboratorEntry
}

function EntityIcon({ entity }: EntityIconProps) {
  const isUser = useMemo(() => entity.entity.startsWith('user:'), [entity])
  return isUser ? <PersonIcon color='primary' /> : <GroupsIcon color='secondary' />
}

type EntityNameDisplayProps = {
  entity: CollaboratorEntry
}

function EntityNameDisplay({ entity }: EntityNameDisplayProps) {
  return <EntityDisplay entity={fromEntity(entity.entity)} />
}
