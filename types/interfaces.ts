import Logger from 'bunyan'
import { Date, Types } from 'mongoose'
import { Dispatch, SetStateAction } from 'react'
import { UserDoc } from '../server/models/User'
import { RenderButtonsInterface } from '../src/Form/RenderButtons'

export type { ApprovalStates, DeploymentDoc as Deployment } from '../server/models/Deployment'
export type { RequestDoc as Request } from '../server/models/Request'
export type { UserDoc as User } from '../server/models/User'
export type { VersionDoc as Version } from '../server/models/Version'

declare global {
  namespace Express {
    interface Request {
      user: UserDoc

      reqId: string
      log: Logger
    }

    interface Response {
      error: (code: number, error: any) => void
    }
  }
}

export interface StatusError extends Error {
  data: any
  code: number
}

export interface ModelMetadata {
  highLevelDetails: {
    tags: Array<string>
    name: string
    modelInASentence: string
    modelOverview: string
    modelCardVersion: string

    [x: string]: any
  }

  contacts: {
    uploader: string
    reviewer: string
    manager: string

    [x: string]: any
  }

  buildOptions?: {
    exportRawModel: boolean
    allowGuestDeployments: boolean
  }

  // allow other properties
  [x: string]: any
}

export interface Model {
  schemaRef: string
  uuid: string

  parent: Types.ObjectId
  versions: Array<Types.ObjectId>

  currentMetadata: ModelMetadata

  owner: Types.ObjectId
}

export interface LogStatement {
  timestamp: Date
  level: string
  msg: string
}

export type SchemaType = 'UPLOAD' | 'DEPLOYMENT'

export interface Schema {
  name: string
  reference: string
  schema: any
  use: SchemaType
}

export interface UiConfig {
  banner: {
    enable: boolean
    text: string
    colour: string
  }

  issues: {
    label: string
    supportHref: string
    contactHref: string
  }

  help: {
    documentationUrl: string
  }

  registry: {
    host: string
  }

  uploadWarning: {
    showWarning: boolean
    checkboxText: string
  }

  deploymentWarning: {
    showWarning: boolean
    checkboxText: string
  }
}

export type RequestType = 'Upload' | 'Deployment'

export type StepType = 'Form' | 'Data' | 'Message'
export interface Step {
  schema: any
  uiSchema?: any

  state: any
  index: number

  type: StepType
  section: string
  schemaRef: string

  render: (RenderInterface) => JSX.Element | null
  renderBasic?: (RenderInterface) => JSX.Element | null
  renderButtons: (RenderButtonsInterface) => JSX.Element | null

  shouldValidate: boolean
  isComplete: (step: Step) => boolean
}

export interface SplitSchema {
  reference: string

  steps: Array<Step>
}

export type ModelId = string | Types.ObjectId

export interface RenderInterface {
  step: Step
  splitSchema: SplitSchema
  setSplitSchema: Dispatch<SetStateAction<SplitSchema>>
}
