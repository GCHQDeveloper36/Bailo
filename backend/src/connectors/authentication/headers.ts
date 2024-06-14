import { NextFunction, Request, Response } from 'express'

import { listUsers } from '../../clients/cognito.js'
import { UserInterface } from '../../models/User.js'
import config from '../../utils/config.js'
import { fromEntity, toEntity } from '../../utils/entity.js'
import { InternalError, NotFound } from '../../utils/error.js'
import { BaseAuthenticationConnector, RoleKeys, UserInformation } from './Base.js'

const HeadersEntityKind = {
  User: 'user',
} as const

const headerConfig = config.authHeaders

let isValidated: boolean
let validationMessage = ''
let groupKey = ''

function validateConfig() {
  // Early return if we have an invalid config
  if (validationMessage.length > 0) {
    throwValidationError(validationMessage)
  }

  // Early return if we're good to go
  if (isValidated) {
    return
  }

  const userFields = Object.values(headerConfig)

  // Check for config length
  if (userFields.length < 1) {
    throwValidationError('No configuration found for header-based authentication')
  }

  if (!userFields.includes('dn')) {
    throwValidationError('No header key for dn which is a required field for BAiLO')
  }

  if (userFields.includes('groups')) {
    for (const headerKey in headerConfig) {
      if (headerConfig[headerKey] == 'groups') {
        groupKey = headerKey
        break
      }
    }
  }

  isValidated = true
}

function throwValidationError(msg: string) {
  validationMessage = msg
  throw new Error(validationMessage)
}

function mapHeadersToMetadata(req: Request) {
  // Ensure user object exists on request
  req.user = req.user ? req.user : {}

  // Iterate over defined header mappings from config
  for (const headerKey in headerConfig) {
    const metadataKey = headerConfig[headerKey]
    // Extracts the actual value for the current header
    const headerValue = req.header(headerKey)

    // Validate we have something for the header value
    if (!headerValue || headerValue.length < 1) {
      if (metadataKey == 'dn') {
        throw new Error('No valid DN found from header')
      }
      // We don't care if other headers are mapped but not found/empty
      break
    }

    // Special case for DN on main object
    if (metadataKey == 'dn') {
      req.user.dn = headerValue
    } else {
      if (!Object.keys(req.user).includes('metadata')) {
        req.user.metadata = {}
      }
      req.user.metadata[metadataKey] = headerValue
    }
  }
}

export class HeadersAuthenticationConnector extends BaseAuthenticationConnector {
  constructor() {
    super()
  }

  authenticationMiddleware() {
    return [
      {
        path: '/api/v2',
        middleware: [this.getUser],
      },
      ...super.authenticationMiddleware(),
    ]
  }

  getUser(req: Request, _res: Response, next: NextFunction) {
    validateConfig()
    mapHeadersToMetadata(req)
    return next()
  }

  async hasRole(user: UserInterface, role: RoleKeys) {
    if (groupKey && groupKey != '' && user.metadata && Object.keys(user.metadata).includes('groups')) {
      // do group/role mapping here from config
      const groups: string = user.metadata['groups']
      const groupList = groups.split(' ')
      groupList.forEach((g) => g.toLowerCase())
      return groupList.includes(role.toLowerCase())
    }
    return false
  }

  async queryEntities(query: string) {
    const entities = (await listUsers(query)).map((user) => ({ kind: HeadersEntityKind.User, id: user.dn }))
    return entities
  }

  async getEntities(user: UserInterface) {
    return [toEntity(HeadersEntityKind.User, user.dn)]
  }

  async getUserInformation(entity: string): Promise<UserInformation> {
    const { kind, value: dn } = fromEntity(entity)

    if (kind !== HeadersEntityKind.User) {
      throw new Error(`Cannot get user information for a non-user entity: ${entity}`)
    }

    const users = await listUsers(dn, true)
    if (users.length > 1) {
      throw InternalError('Cannot get user information. Found more than one user.', { entity, lookupResult: users })
    }
    if (users.length === 0) {
      throw NotFound('Cannot get user information. User not found.', { entity })
    }
    const { dn: _returnedDn, ...info } = users[0]
    return info
  }

  async getEntityMembers(entity: string): Promise<string[]> {
    const { kind } = fromEntity(entity)
    switch (kind) {
      case HeadersEntityKind.User:
        return [entity]
      default:
        throw new Error(`Unable to get members, entity kind not recognised: ${entity}`)
    }
  }
}
