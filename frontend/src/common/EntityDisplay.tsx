import { Label } from '@mui/icons-material'
import EmailIcon from '@mui/icons-material/Email'
import UserIcon from '@mui/icons-material/Person'
import { Box, Divider, Popover, Stack, Typography } from '@mui/material'
import { useGetEntityInformation } from 'actions/user'
import { MouseEvent, useMemo, useRef, useState } from 'react'
import CopyToClipboardButton from 'src/common/CopyToClipboardButton'
import Loading from 'src/common/Loading'
import { EntityObject } from 'types/types'

export type EntityInformation = {
  kind: string
  dn: string
  name?: string
  email?: string
} & AdditionalProperties

type AdditionalProperties = {
  metadata?: {
    [x: string]: string
  }
}

export type EntityDisplayProps = {
  entity: EntityObject
  hidePopover?: boolean
}

export default function EntityDisplay({ entity, hidePopover = false }: EntityDisplayProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = useMemo(() => !!anchorEl, [anchorEl])
  const ref = useRef<HTMLDivElement>(null)

  const { entityInformation, isEntityInformationLoading, isEntityInformationError } = useGetEntityInformation(entity)

  const popoverEnter = () => {
    if (ref.current) {
      setAnchorEl(ref.current)
    }
  }

  const popoverLeave = () => {
    setAnchorEl(null)
  }

  if (isEntityInformationLoading) {
    return <Loading />
  }

  return (
    <>
      <Box
        component='span'
        ref={ref}
        data-test='entityDisplayName'
        aria-owns={open ? 'user-popover' : undefined}
        aria-haspopup='true'
        sx={{ fontWeight: 'bold' }}
        onMouseEnter={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
        onMouseLeave={() => setAnchorEl(null)}
      >
        {entityInformation ? entityInformation.name : entity.id.charAt(0).toUpperCase() + entity.id.slice(1)}
      </Box>
      {!hidePopover && (
        <Popover
          id='user-popover'
          sx={{
            pointerEvents: 'none',
          }}
          PaperProps={{ onMouseEnter: popoverEnter, onMouseLeave: popoverLeave, sx: { pointerEvents: 'auto' } }}
          open={open}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          onClose={() => setAnchorEl(null)}
          disableRestoreFocus
        >
          <Stack spacing={1} sx={{ p: 2 }}>
            <Stack direction='row' alignItems='center' spacing={1}>
              <UserIcon color='primary' />
              <Typography color='primary' fontWeight='bold' data-test='entityDisplayNameProperty'>
                {entityInformation ? entityInformation.name : entity.id.charAt(0).toUpperCase() + entity.id.slice(1)}
              </Typography>
            </Stack>
            <Divider />
            {!entityInformation && isEntityInformationError && (
              <Typography>{isEntityInformationError.info.message}</Typography>
            )}
            {entityInformation && (
              <>
                <Stack direction='row' spacing={1} alignItems='center'>
                  <EmailIcon color='primary' />
                  <Typography data-test='entityDisplayEmailProperty'>
                    <Box component='span' fontWeight='bold'>
                      Email
                    </Box>
                    : {entityInformation.email}
                  </Typography>
                  <CopyToClipboardButton
                    textToCopy={entityInformation.email ? entityInformation.email : ''}
                    notificationText='Copied email address to clipboard'
                    ariaLabel='copy email address to clipboard'
                  />
                </Stack>
                {Object.keys(entityInformation).map((key) => {
                  if (key !== 'dn' && key !== 'kind' && key !== 'name' && key !== 'email') {
                    return (
                      <Stack direction='row' spacing={1} key={key}>
                        <Label color='primary' />
                        <Typography data-test={`entityDisplayDynamicProperty-${key}`}>
                          <Box component='span' fontWeight='bold'>
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </Box>
                          : {entityInformation[key]}
                        </Typography>
                      </Stack>
                    )
                  }
                })}
                {entityInformation.metadata &&
                  Object.keys(entityInformation.metadata).map((key) => {
                    return (
                      <Stack direction='row' spacing={1} key={key}>
                        <Label color='primary' />
                        <Typography data-test={`entityDisplayDynamicProperty-${key}`}>
                          <Box component='span' fontWeight='bold'>
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </Box>
                          : {entityInformation.metadata && entityInformation.metadata[key]}
                        </Typography>
                      </Stack>
                    )
                  })}
              </>
            )}
          </Stack>
        </Popover>
      )}
    </>
  )
}
