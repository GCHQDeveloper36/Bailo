import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'

import Wrapper from '@/src/Wrapper'
import { useGetDefaultSchema, useGetSchemas } from '@/data/schema'
import MultipleErrorWrapper from '@/src/errors/MultipleErrorWrapper'
import { Schema, Step, User } from '@/types/interfaces'
import { createStep, getStepsData, getStepsFromSchema } from '@/utils/formUtils'

import SchemaSelector from '@/src/Form/SchemaSelector'
import SubmissionError from '@/src/Form/SubmissionError'
import Form from '@/src/Form/Form'
import ModelExportAndSubmission from '@/src/Form/ModelExportAndSubmission'
import RenderFileTab, { FileTabComplete } from '@/src/Form/RenderFileTab'
import RenderBasicFileTab from '@/src/Form/RenderBasicFileTab'
import { useGetCurrentUser } from '@/data/user'
import { MinimalErrorWrapper } from '@/src/errors/ErrorWrapper'
import { getErrorMessage } from '@/utils/fetcher'

function renderSubmissionTab(
  step: Step,
  steps: Array<Step>,
  _setSteps: Function,
  activeStep: number,
  setActiveStep: Function,
  onSubmit: Function,
  _openValidateError: boolean,
  _setOpenValidateError: Function
) {
  const data = getStepsData(steps)

  return (
    <>
      <ModelExportAndSubmission
        formData={data}
        steps={steps}
        schemaRef={step.schemaRef}
        onSubmit={onSubmit}
        setActiveStep={setActiveStep}
        activeStep={activeStep}
      />
    </>
  )
}

const uiSchema = {
  contacts: {
    uploader: { 'ui:widget': 'userSelector' },
    reviewer: { 'ui:widget': 'userSelector' },
    manager: { 'ui:widget': 'userSelector' },
  },
}

function Upload() {
  const { defaultSchema, isDefaultSchemaError, isDefaultSchemaLoading } = useGetDefaultSchema('UPLOAD')
  const { schemas, isSchemasLoading, isSchemasError } = useGetSchemas('UPLOAD')
  const { currentUser, isCurrentUserLoading, isCurrentUserError } = useGetCurrentUser()

  const router = useRouter()

  const [currentSchema, setCurrentSchema] = useState<Schema | undefined>(undefined)
  const [user, setUser] = useState<User | undefined>(undefined)
  const [steps, setSteps] = useState<Array<Step>>([])
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (currentSchema) return

    setCurrentSchema(defaultSchema)
  }, [defaultSchema, currentSchema])

  useEffect(() => {
    if (user) return

    setUser(currentUser)
  }, [user, currentUser])

  useEffect(() => {
    if (!currentSchema || !user) return

    const { schema, reference } = currentSchema
    const defaultState = {
      contacts: { uploader: user.id },
    }

    const schemaSteps = getStepsFromSchema(schema, uiSchema, undefined, defaultState)

    schemaSteps.push(
      createStep({
        schema: {
          title: 'Files',
        },
        state: {
          binary: undefined,
          code: undefined,
        },
        schemaRef: reference,

        type: 'Data',
        index: schemaSteps.length,
        section: 'files',

        render: RenderFileTab,
        renderBasic: RenderBasicFileTab,
        isComplete: FileTabComplete,
      })
    )

    schemaSteps.push(
      createStep({
        schema: {
          title: 'Submission',
        },
        state: {},
        schemaRef: reference,

        type: 'Message',
        index: schemaSteps.length,
        section: 'submission',

        render: () => <></>,
        renderButtons: renderSubmissionTab,
        isComplete: () => true,
      })
    )

    setSteps(schemaSteps)
  }, [currentSchema, user])

  const errorWrapper = MultipleErrorWrapper(
    `Unable to load upload page`,
    {
      isDefaultSchemaError,
      isSchemasError,
      isCurrentUserError,
    },
    MinimalErrorWrapper
  )
  if (errorWrapper) return errorWrapper

  if (isDefaultSchemaLoading || isSchemasLoading || isCurrentUserLoading) {
    return <></>
  }

  const onSubmit = async () => {
    setError(undefined)

    if (!steps.every((e) => e.isComplete(e))) {
      return setError('Ensure all steps are complete before submitting')
    }

    const data = getStepsData(steps, true)
    const form = new FormData()

    data.schemaRef = currentSchema?.reference

    form.append('code', data.files.code)
    form.append('binary', data.files.binary)

    delete data.files

    form.append('metadata', JSON.stringify(data))

    const upload = await fetch('/api/v1/model', {
      method: 'POST',
      body: form,
    })

    if (upload.status >= 400) {
      return setError(await getErrorMessage(upload))
    }

    const { uuid } = await upload.json()
    router.push(`/model/${uuid}`)
  }

  return (
    <Paper variant='outlined' sx={{ my: { xs: 3, md: 6 }, p: { xs: 2, md: 3 } }}>
      <Grid container justifyContent='space-between' alignItems='center'>
        <Box />
        <SchemaSelector
          currentSchema={currentSchema ?? defaultSchema!}
          setCurrentSchema={setCurrentSchema}
          schemas={schemas!}
        />
      </Grid>

      <SubmissionError error={error} />
      <Form steps={steps} setSteps={setSteps} onSubmit={onSubmit} />
    </Paper>
  )
}

export default function Outer() {
  return (
    <Wrapper title={'Upload Model'} page={'upload'}>
      <Upload />
    </Wrapper>
  )
}
