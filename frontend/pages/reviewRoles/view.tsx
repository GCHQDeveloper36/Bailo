import { Button, Container, Divider, List, Paper, Stack, Typography } from '@mui/material'
import { useGetModelRoles } from 'actions/model'
import { useGetAllReviewRoles } from 'actions/reviewRoles'
import { useGetCurrentUser } from 'actions/user'
import { useMemo, useState } from 'react'
import EmptyBlob from 'src/common/EmptyBlob'
import Forbidden from 'src/common/Forbidden'
import Loading from 'src/common/Loading'
import SimpleListItemButton from 'src/common/SimpleListItemButton'
import Title from 'src/common/Title'
import ErrorWrapper from 'src/errors/ErrorWrapper'
import { getRoleDisplayName } from 'utils/roles'

export default function ReviewRoles() {
  const { reviewRoles, isReviewRolesLoading, isReviewRolesError } = useGetAllReviewRoles()
  const { modelRoles, isModelRolesLoading, isModelRolesError } = useGetModelRoles()
  const [selectedRole, setSelectedRole] = useState<number>(0)
  const { currentUser, isCurrentUserLoading, isCurrentUserError } = useGetCurrentUser()

  const listRoles = useMemo(
    () =>
      reviewRoles.map((reviewRole, index) => (
        <SimpleListItemButton
          selected={selectedRole === index}
          key={reviewRole.id}
          onClick={() => setSelectedRole(index)}
        >
          {reviewRole.name}
        </SimpleListItemButton>
      )),
    [reviewRoles, selectedRole],
  )

  const listRoleDescriptions = useMemo(
    () =>
      reviewRoles[selectedRole] && (
        <>
          <Typography color='primary' fontWeight='bold'>
            Description
          </Typography>
          <Typography>{reviewRoles[selectedRole].description}</Typography>
          <Typography color='primary' fontWeight='bold'>
            Short Name
          </Typography>
          <Typography>{reviewRoles[selectedRole].short}</Typography>
          <Typography color='primary' fontWeight='bold'>
            System Role
          </Typography>
          {reviewRoles[selectedRole].collaboratorRole ? (
            <Typography>{getRoleDisplayName(reviewRoles[selectedRole].collaboratorRole, modelRoles)}</Typography>
          ) : (
            <Typography fontStyle='italic'>Unset</Typography>
          )}
        </>
      ),
    [reviewRoles, selectedRole, modelRoles],
  )

  if (isCurrentUserLoading || isModelRolesLoading || isReviewRolesLoading) {
    return <Loading />
  }

  if (isCurrentUserError) {
    return <ErrorWrapper message={isCurrentUserError.info.message} />
  }

  if (isReviewRolesError) {
    return <ErrorWrapper message={isReviewRolesError.info.message} />
  }

  if (isModelRolesError) {
    return <ErrorWrapper message={isModelRolesError.info.message} />
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
      <Container>
        <Stack mx={2} mb={1} direction='row' justifyContent='space-between'>
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
      </Container>
    </>
  )
}
