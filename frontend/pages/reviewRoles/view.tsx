import { Box, Button, Container, Divider, List, ListItem, Paper, Stack, Typography } from '@mui/material'
import { deleteReviewRole, useGetReviewRoles } from 'actions/reviewRoles'
import { useGetSchemas } from 'actions/schema'
import { useGetCurrentUser } from 'actions/user'
import { Fragment, useCallback, useMemo, useState } from 'react'
import ConfirmationDialogue from 'src/common/ConfirmationDialogue'
import EmptyBlob from 'src/common/EmptyBlob'
import Forbidden from 'src/common/Forbidden'
import Loading from 'src/common/Loading'
import SimpleListItemButton from 'src/common/SimpleListItemButton'
import Title from 'src/common/Title'
import UserDisplay from 'src/common/UserDisplay'
import ErrorWrapper from 'src/errors/ErrorWrapper'
import { plural } from 'utils/stringUtils'

export default function ReviewRoles() {
  const { reviewRoles, isReviewRolesLoading, isReviewRolesError, mutateReviewRoles } = useGetReviewRoles()
  const [selectedRole, setSelectedRole] = useState<number>(0)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { currentUser, isCurrentUserLoading, isCurrentUserError } = useGetCurrentUser()
  const { schemas, isSchemasLoading, isSchemasError } = useGetSchemas()

  const listRoles = useMemo(
    () =>
      reviewRoles.map((reviewRole, index) => (
        <SimpleListItemButton
          selected={selectedRole === index}
          key={reviewRole._id}
          onClick={() => setSelectedRole(index)}
        >
          {reviewRole.name}
        </SimpleListItemButton>
      )),
    [reviewRoles, selectedRole],
  )

  const schemasLength = useCallback(
    (reviewRole: string) => {
      if (schemas) {
        return schemas.filter((schema) => schema.reviewRoles.includes(reviewRole)).length
      } else {
        return 0
      }
    },
    [schemas],
  )

  const handleOpenDeleteConfirmation = useCallback(() => {
    setErrorMessage('')
    setConfirmationOpen(true)
  }, [setErrorMessage, setConfirmationOpen])

  const handleDeleteReviewRole = useCallback(
    async (reviewRoleId) => {
      const res = await deleteReviewRole(reviewRoleId)
      if (res.status !== 200) {
        setErrorMessage('There was a problem deleting this role.')
      } else {
        mutateReviewRoles()
        setConfirmationOpen(false)
      }
    },
    [setErrorMessage, setConfirmationOpen, mutateReviewRoles],
  )

  const listRoleDescriptions = useMemo(
    () =>
      reviewRoles.map((reviewRole, index) => (
        <Fragment key={reviewRole._id}>
          {selectedRole === index && (
            <>
              <Stack spacing={2}>
                <Box>
                  <Typography color='primary' fontWeight='bold'>
                    Description
                  </Typography>
                  <Typography>{reviewRole.description}</Typography>
                </Box>
                <Box>
                  <Typography color='primary' fontWeight='bold'>
                    System Role
                  </Typography>
                  <Typography>{reviewRole.collaboratorRole}</Typography>
                </Box>
                <Box>
                  <Typography color='primary' fontWeight='bold'>
                    Default entities
                  </Typography>
                  <List>
                    {!reviewRole.defaultEntities ||
                      (reviewRole.defaultEntities.length === 0 && <Typography>No entities assigned</Typography>)}
                    {reviewRole.defaultEntities &&
                      reviewRole.defaultEntities.map((entity) => (
                        <ListItem key={entity}>
                          <UserDisplay dn={entity} />
                        </ListItem>
                      ))}
                  </List>
                </Box>
                <Button
                  color='error'
                  sx={{ width: 'max-content' }}
                  variant='contained'
                  onClick={handleOpenDeleteConfirmation}
                >
                  Delete role
                </Button>
              </Stack>
              <ConfirmationDialogue
                open={confirmationOpen}
                title='Deleting this role will remove it from any schemas it is attached to, and will also remove the role from any model collaborators assigned to that role.'
                onCancel={() => setConfirmationOpen(false)}
                onConfirm={() => handleDeleteReviewRole(reviewRole._id)}
                dialogMessage={
                  schemasLength(reviewRole.shortName) > 0
                    ? `If deleted, this role will be removed from ${plural(schemasLength(reviewRole.shortName), 'schema')}. Are you sure you want to remove this review role?`
                    : 'Are you sure want to remove this review role?'
                }
                errorMessage={errorMessage}
              />
            </>
          )}
        </Fragment>
      )),
    [
      reviewRoles,
      selectedRole,
      setConfirmationOpen,
      handleOpenDeleteConfirmation,
      handleDeleteReviewRole,
      confirmationOpen,
      errorMessage,
      schemasLength,
    ],
  )

  if (isCurrentUserLoading || isReviewRolesLoading || isSchemasLoading) {
    return <Loading />
  }

  if (isCurrentUserError) {
    return <ErrorWrapper message={isCurrentUserError.info.message} />
  }

  if (isReviewRolesError) {
    return <ErrorWrapper message={isReviewRolesError.info.message} />
  }

  if (isSchemasError) {
    return <ErrorWrapper message={isSchemasError.info.message} />
  }

  if (!currentUser || !currentUser.isAdmin) {
    return (
      <Forbidden
        errorMessage='If you think this is an error please contact the Bailo administrators'
        noMargin
        hideNavButton
      />
    )
  }

  return (
    <>
      <Title text='View Review Roles' />
      <Stack mx={2} mb={1} direction='row' divider={<Divider flexItem orientation='vertical' />} spacing={2}>
        <Typography component='h1' color='primary' variant='h6' noWrap>
          Review Roles
        </Typography>
        <Button variant='contained' href='/reviewRoles/new' color='primary'>
          Create new Review Role
        </Button>
      </Stack>
      {reviewRoles ? (
        <Paper sx={{ p: 4, my: 4 }}>
          {reviewRoles.length > 0 ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ sm: 2 }}
              divider={<Divider orientation='vertical' flexItem />}
            >
              <List sx={{ width: '200px' }}>{listRoles}</List>
              <Container sx={{ my: 2 }}>{listRoleDescriptions}</Container>
            </Stack>
          ) : (
            <EmptyBlob text='No review roles found. Press button in top-right to create new review role.' />
          )}
        </Paper>
      ) : (
        <Loading />
      )}
    </>
  )
}
