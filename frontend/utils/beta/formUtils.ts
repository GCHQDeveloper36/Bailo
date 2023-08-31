import { Validator } from 'jsonschema'
import dropRight from 'lodash/dropRight'
import get from 'lodash/get'
import omit from 'lodash/omit'
import remove from 'lodash/remove'
import { cloneDeep } from 'lodash-es'
import { Dispatch, SetStateAction } from 'react'

import { SplitSchema, Step, StepType } from '../../types/interfaces'
import { createUiSchema } from '../uiSchemaUtils'

export function createStep({
  schema,
  uiSchema,
  state,
  type,
  section,
  index,
  schemaRef,
  isComplete,
}: {
  schema: any
  uiSchema?: any
  state: any
  type: StepType
  section: string
  index: number
  schemaRef: string
  isComplete: (step: Step) => boolean
}): Step {
  return {
    schema,
    uiSchema,
    state,
    type,
    index,

    section,
    schemaRef,

    shouldValidate: false,

    isComplete,
  }
}

export function setStepState(
  _splitSchema: SplitSchema,
  setSplitSchema: Dispatch<SetStateAction<SplitSchema>>,
  step: Step,
  state: any
) {
  setSplitSchema((oldSchema) => {
    const index = oldSchema.steps.findIndex((iStep) => step.section === iStep.section)

    const duplicatedSteps = [...oldSchema.steps]
    duplicatedSteps[index].state = {
      ...(oldSchema.steps[index].state || {}),
      ...state,
    }

    for (const duplicatedStep of duplicatedSteps) {
      duplicatedStep.steps = duplicatedSteps
    }

    return { ...oldSchema, steps: duplicatedSteps }
  })
}

export function setStepValidate(
  splitSchema: SplitSchema,
  setSplitSchema: Dispatch<SetStateAction<SplitSchema>>,
  step: Step,
  validate: boolean
) {
  const index = splitSchema.steps.findIndex((iStep) => step.section === iStep.section)

  const duplicatedSteps = [...splitSchema.steps]
  duplicatedSteps[index].shouldValidate = validate

  for (const duplicatedStep of duplicatedSteps) {
    duplicatedStep.steps = duplicatedSteps
  }

  setSplitSchema({ ...splitSchema, steps: duplicatedSteps })
}

export function getStepsFromSchema(
  schema: any,
  baseUiSchema: any = {},
  omitFields: Array<string> = [],
  state: any = {}
): Array<Step> {
  console.log(omitFields)
  const schemaDupe = omit(schema.schema, omitFields) as any

  for (const field of omitFields) {
    const fields = field.split('.')
    remove(get(schemaDupe, `${dropRight(fields, 2).join('.')}.required`, []), (v) => v === fields[fields.length - 1])
  }

  const uiSchema = createUiSchema(schemaDupe, baseUiSchema)
  const props = Object.keys(schemaDupe.properties).filter((key) =>
    ['object', 'array'].includes(schemaDupe.properties[key].type)
  )

  const steps: Array<Step> = []
  props.forEach((prop: any, index: number) => {
    const createdStep = createStep({
      schema: {
        definitions: schemaDupe.definitions,
        ...schemaDupe.properties[prop],
      },
      uiSchema: uiSchema[prop],
      state: state[prop] || {},
      type: 'Form',
      index,
      schemaRef: schema.reference,

      section: prop,
      isComplete: validateForm,
    })

    steps.push(createdStep)
  })

  return steps
}

export function getStepsData(splitSchema: SplitSchema, includeAll = false) {
  const data: any = {}

  splitSchema.steps.forEach((step) => {
    if (!includeAll && step.type !== 'Form') return

    data[step.section] = step.state
  })

  // Make sure not to return a weak reference to the underlying steps
  return cloneDeep(data)
}

export function setStepsData(
  splitSchema: SplitSchema,
  setSplitSchema: Dispatch<SetStateAction<SplitSchema>>,
  data: any
) {
  const newSteps = splitSchema.steps.map((step) => {
    if (!data[step.section]) return { ...step }
    if (step.type !== 'Form') return { ...step }

    return {
      ...step,
      state: data[step.section],
    }
  })

  for (const step of newSteps) {
    step.steps = newSteps
  }

  setSplitSchema({ ...splitSchema, steps: newSteps })
}

export function validateForm(step: Step) {
  const validator = new Validator()
  const sectionErrors = validator.validate(step.state, step.schema)

  return sectionErrors.errors.length === 0
}
