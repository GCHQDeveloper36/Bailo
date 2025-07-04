import { AccessRequestDoc } from '../../models/AccessRequest.js'
import { FileInterface } from '../../models/File.js'
import { EntryVisibility, ModelDoc } from '../../models/Model.js'
import { ReleaseDoc, ReleaseInterface } from '../../models/Release.js'
import { ResponseDoc } from '../../models/Response.js'
import { ReviewRoleInterface } from '../../models/ReviewRole.js'
import { SchemaDoc } from '../../models/Schema.js'
import { UserInterface } from '../../models/User.js'
import { Access } from '../../routes/v1/registryAuth.js'
import { getModelAccessRequestsForUser } from '../../services/accessRequest.js'
import { checkAccessRequestsApproved } from '../../services/response.js'
import { validateTokenForModel, validateTokenForUse } from '../../services/token.js'
import { toEntity } from '../../utils/entity.js'
import { Roles } from '../authentication/Base.js'
import authentication from '../authentication/index.js'
import {
  AccessRequestAction,
  AccessRequestActionKeys,
  ActionLookup,
  FileAction,
  FileActionKeys,
  ImageAction,
  ImageActionKeys,
  ModelAction,
  ModelActionKeys,
  ReleaseAction,
  ReleaseActionKeys,
  ResponseAction,
  ResponseActionKeys,
  ReviewRoleAction,
  ReviewRoleActionKeys,
  SchemaAction,
  SchemaActionKeys,
} from './actions.js'

export type Response = { id: string; success: true } | { id: string; success: false; info: string }

export class BasicAuthorisationConnector {
  async hasModelVisibilityAccess(user: UserInterface, model: ModelDoc) {
    if (model.visibility === EntryVisibility.Public) {
      return true
    }

    const roles = await authentication.getUserModelRoles(user, model)
    if (roles.length === 0) return false

    return true
  }

  async hasApprovedAccessRequest(user: UserInterface, model: ModelDoc) {
    const accessRequests = await getModelAccessRequestsForUser(user, model.id)
    if (accessRequests.length === 0) {
      return false
    }
    return await checkAccessRequestsApproved(accessRequests.map((accessRequest) => accessRequest.id))
  }

  async model(user: UserInterface, model: ModelDoc, action: ModelActionKeys) {
    return (await this.models(user, [model], action))[0]
  }

  async schema(user: UserInterface, schema: SchemaDoc, action: SchemaActionKeys) {
    return (await this.schemas(user, [schema], action))[0]
  }

  async release(user: UserInterface, model: ModelDoc, action: ReleaseActionKeys, release?: ReleaseDoc) {
    return (await this.releases(user, model, release ? [release] : [], action))[0]
  }

  async reviewRole(user: UserInterface, reviewRole: ReviewRoleInterface, action: ReviewRoleActionKeys) {
    return (await this.reviewRoles(user, [reviewRole], action))[0]
  }

  async accessRequest(
    user: UserInterface,
    model: ModelDoc,
    accessRequest: AccessRequestDoc,
    action: AccessRequestActionKeys,
  ) {
    return (await this.accessRequests(user, model, [accessRequest], action))[0]
  }

  async response(user: UserInterface, response: ResponseDoc, action: ResponseActionKeys) {
    return (await this.responses(user, [response], action))[0]
  }

  async file(user: UserInterface, model: ModelDoc, file: FileInterface, action: FileActionKeys) {
    return (await this.files(user, model, [file], action))[0]
  }

  async image(user: UserInterface, model: ModelDoc, access: Access) {
    return (await this.images(user, model, [access]))[0]
  }

  async models(user: UserInterface, models: Array<ModelDoc>, action: ModelActionKeys): Promise<Array<Response>> {
    return Promise.all(
      models.map(async (model) => {
        // Is this a constrained user token.
        const tokenAuth = await validateTokenForModel(user.token, model.id, ActionLookup[action])
        if (!tokenAuth.success) {
          return tokenAuth
        }

        // Prohibit non-collaborators from seeing private models
        if (ModelAction.Import !== action && !(await this.hasModelVisibilityAccess(user, model))) {
          return {
            id: model.id,
            success: false,
            info: 'You cannot interact with a private model that you do not have access to.',
          }
        }

        // Check a user has a role before allowing write actions
        if (
          ModelAction.Write === action &&
          (await missingRequiredRole(user, model, ['owner', 'mtr', 'msro', 'contributor']))
        ) {
          return { id: model.id, success: false, info: 'You do not have permission to update a model card.' }
        }

        if (
          ModelAction.Update === action &&
          (await missingRequiredRole(user, model, ['owner', 'mtr', 'msro'])) &&
          !(await authentication.hasRole(user, Roles.Admin))
        ) {
          return { id: model.id, success: false, info: 'You do not have permission to update a model.' }
        }

        if (ModelAction.Import === action && (await missingRequiredRole(user, model, ['owner']))) {
          return { id: model.id, success: false, info: 'You do not have permission to import a model.' }
        }

        if (ModelAction.Export === action && (await missingRequiredRole(user, model, ['owner']))) {
          return { id: model.id, success: false, info: 'You do not have permission to export a model.' }
        }

        return { id: model.id, success: true }
      }),
    )
  }

  async responses(user: UserInterface, responses: ResponseDoc[], action: ResponseActionKeys): Promise<Array<Response>> {
    return Promise.all(
      responses.map(async (response) => {
        if (action === ResponseAction.Update && toEntity('user', user.dn) !== response.entity) {
          return { id: user.dn, success: false, info: 'Only the author can update a comment' }
        }
        return {
          id: user.dn,
          success: true,
        }
      }),
    )
  }

  async schemas(user: UserInterface, schemas: Array<SchemaDoc>, action: SchemaActionKeys): Promise<Array<Response>> {
    return Promise.all(
      schemas.map(async (schema) => {
        // Is this a constrained user token.
        const tokenAuth = await validateTokenForUse(user.token, ActionLookup[action])
        if (!tokenAuth.success) {
          return tokenAuth
        }

        if (action === SchemaAction.Create || action === SchemaAction.Delete) {
          const isAdmin = await authentication.hasRole(user, Roles.Admin)

          if (!isAdmin) {
            return {
              id: schema.id,
              success: false,
              info: 'You cannot upload or modify a schema if you are not an admin.',
            }
          }
        }

        return {
          id: schema.id,
          success: true,
        }
      }),
    )
  }

  async releases(
    user: UserInterface,
    model: ModelDoc,
    releases: Array<ReleaseDoc | ReleaseInterface>,
    action: ReleaseActionKeys,
  ): Promise<Array<Response>> {
    // We don't have any specific roles dedicated to releases, so we pass it through to the model authorisation checker.
    // We do need to map some actions to other model actions.
    const actionMap: Record<ReleaseActionKeys, ModelActionKeys> = {
      [ReleaseAction.Create]: ModelAction.Write,
      [ReleaseAction.Delete]: ModelAction.Write,
      [ReleaseAction.Update]: ModelAction.Update,
      [ReleaseAction.View]: ModelAction.View,
      [ReleaseAction.Import]: ModelAction.Import,
      [ReleaseAction.Export]: ModelAction.Export,
    }

    // Is this a constrained user token.
    const tokenAuth = await validateTokenForModel(user.token, model.id, ActionLookup[action])
    if (!tokenAuth.success) {
      return releases.length ? releases.map(() => tokenAuth) : [tokenAuth]
    }

    return new Array(releases.length || 1).fill(await this.model(user, model, actionMap[action]))
  }

  async accessRequests(
    user: UserInterface,
    model: ModelDoc,
    accessRequests: Array<AccessRequestDoc>,
    action: AccessRequestActionKeys,
  ): Promise<Array<Response>> {
    const entities = await authentication.getEntities(user)

    return Promise.all(
      accessRequests.map(async (request) => {
        // Is this a constrained user token.
        const tokenAuth = await validateTokenForModel(user.token, model.id, ActionLookup[action])
        if (!tokenAuth.success) {
          return tokenAuth
        }

        // Does any individual in the access request share an entity with our user?
        const isNamed = request.metadata.overview.entities.some((value) => entities.includes(value))

        /**
         * Reject if:
         *  - user is not named on the access request
         *  - user is not the owner of the model
         *  - the user is trying to delete or update an existing AR
         */
        if (
          !isNamed &&
          (await missingRequiredRole(user, model, ['owner', 'mtr', 'msro'])) &&
          ([AccessRequestAction.Delete, AccessRequestAction.Update] as AccessRequestActionKeys[]).includes(action)
        ) {
          return { success: false, info: 'You cannot change an access request you do not own.', id: request.id }
        }

        // Otherwise they either own the model, access request or this is a read-only action.
        return { success: true, id: request.id }
      }),
    )
  }

  async files(
    user: UserInterface,
    model: ModelDoc,
    files: Array<FileInterface>,
    action: FileActionKeys,
  ): Promise<Array<Response>> {
    // Does the user have a valid access request for this model?
    const hasApprovedAccessRequest = await this.hasApprovedAccessRequest(user, model)
    return Promise.all(
      files.map(async (file) => {
        // Is this a constrained user token.
        const tokenAuth = await validateTokenForModel(user.token, model.id, ActionLookup[action])
        if (!tokenAuth.success) {
          return tokenAuth
        }

        // If they are not listed on the model, don't let them upload or delete files.
        if (
          ([FileAction.Delete, FileAction.Upload] as FileActionKeys[]).includes(action) &&
          (await missingRequiredRole(user, model, ['owner', 'contributor']))
        ) {
          let errorInfo: string
          switch (action) {
            case FileAction.Delete: {
              errorInfo = 'You do not have permission to delete a file.'
              break
            }
            case FileAction.Upload: {
              errorInfo = 'You do not have permission to upload a file.'
              break
            }
            default: {
              errorInfo = 'You not have permission to perform this action'
            }
          }
          return {
            success: false,
            info: errorInfo,
            id: file._id.toString(),
          }
        }

        if (
          ([FileAction.Download] as FileActionKeys[]).includes(action) &&
          !model.settings.ungovernedAccess &&
          !hasApprovedAccessRequest &&
          (await missingRequiredRole(user, model, ['owner', 'contributor', 'consumer']))
        ) {
          return {
            success: false,
            info: 'You need to have an approved access request or have permission to download a file.',
            id: file._id.toString(),
          }
        }

        if (
          ([FileAction.Update] as FileActionKeys[]).includes(action) &&
          (await missingRequiredRole(user, model, ['owner', 'contributor']))
        ) {
          return {
            success: false,
            info: 'You are missing the required roles in order to update tags on this file.',
            id: file._id.toString(),
          }
        }

        return { success: true, id: file._id.toString() }
      }),
    )
  }

  async images(user: UserInterface, model: ModelDoc, accesses: Array<Access>): Promise<Array<Response>> {
    // Does the user have a valid access request for this model?
    const hasAccessRequest = await this.hasApprovedAccessRequest(user, model)

    return Promise.all(
      accesses.map(async (access) => {
        const actions = access.actions.map((action) => {
          switch (action) {
            case '*':
              return ImageAction.Wildcard
            case 'delete':
              return ImageAction.Delete
            case 'list':
              return ImageAction.List
            case 'pull':
              return ImageAction.Pull
            case 'push':
              return ImageAction.Push
          }
        })

        // Don't allow anything beyond pushing and pulling actions.
        if (
          !actions.every((action) =>
            ([ImageAction.Push, ImageAction.Pull, ImageAction.List] as ImageActionKeys[]).includes(action),
          )
        ) {
          return {
            success: false,
            info: 'You are not allowed to complete any actions beyond `push` or `pull` on an image.',
            id: access.name,
          }
        }

        // Is this a constrained user token.
        for (const action of actions) {
          const tokenAuth = await validateTokenForModel(user.token, model.id, ActionLookup[action])
          if (!tokenAuth.success) {
            return tokenAuth
          }
        }

        // If they are not listed on the model, don't let them upload or delete images.
        if (
          (await missingRequiredRole(user, model, ['owner', 'msro', 'mtr', 'contributor'])) &&
          actions.includes(ImageAction.Push)
        ) {
          return {
            success: false,
            info: 'You do not have permission to upload an image.',
            id: access.name,
          }
        }

        if (
          !hasAccessRequest &&
          (await missingRequiredRole(user, model, ['owner', 'contributor', 'msro', 'mtr', 'consumer'])) &&
          actions.includes(ImageAction.Pull) &&
          !model.settings.ungovernedAccess
        ) {
          return {
            success: false,
            info: 'You need to have an approved access request to download an image.',
            id: access.name,
          }
        }

        return { success: true, id: access.name }
      }),
    )
  }

  async reviewRoles(
    user: UserInterface,
    reviewRoles: Array<ReviewRoleInterface>,
    action: ReviewRoleActionKeys,
  ): Promise<Array<Response>> {
    return Promise.all(
      reviewRoles.map(async (reviewRole) => {
        // Is this a constrained user token.
        const tokenAuth = await validateTokenForUse(user.token, ActionLookup[action])
        if (!tokenAuth.success) {
          return tokenAuth
        }

        if (action === ReviewRoleAction.Create) {
          const isAdmin = await authentication.hasRole(user, Roles.Admin)

          if (!isAdmin) {
            return {
              id: reviewRole.id,
              success: false,
              info: 'You cannot upload or modify a review role if you are not an admin.',
            }
          }
        }

        return {
          id: reviewRole.id,
          success: true,
        }
      }),
    )
  }
}

async function missingRequiredRole(user: UserInterface, model: ModelDoc, roles: Array<string>) {
  const modelRoles = await authentication.getUserModelRoles(user, model)
  return !modelRoles.some((value) => roles.includes(value))
}

export async function partials<T>(
  data: Array<T>,
  responses: Array<Response>,
  func: (items: Array<T>) => Array<Response>,
): Promise<Array<Response>> {
  const items = data.filter((_, i) => responses[i].success)
  const newResponses = await Promise.resolve(func(items))

  if (newResponses.length !== items.length) {
    throw new Error('The function did not return a response for every item.')
  }

  let responsesIndex = 0
  const mergedResponses = responses.map((response) => {
    if (response.success) {
      return newResponses[responsesIndex++]
    }

    return response
  })

  return mergedResponses
}
