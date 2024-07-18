import { RequestHandler } from 'express'

import { ModelDoc } from '../../models/Model.js'
import { UserInterface } from '../../models/User.js'
import { checkAuthentication, getTokenFromAuthHeader } from '../../routes/middleware/defaultAuthentication.js'

export const Roles = {
  Admin: 'admin',
} as const
export type RoleKeys = (typeof Roles)[keyof typeof Roles]

export interface EntityInformation {
  kind: string
  dn: string
  metadata?: any
  name?: string
  organisation?: string
  email?: string
}

export abstract class BaseAuthenticationConnector {
  abstract hasRole(user: UserInterface, role: RoleKeys): Promise<boolean>

  abstract queryEntities(query: string): Promise<Array<{ kind: string; id: string }>>
  abstract getEntities(user: UserInterface): Promise<Array<string>>
  abstract getEntityInformation(userEntity: string): Promise<EntityInformation>
  abstract getEntityMembers(entity: string): Promise<Array<string>>

  async getUserInformationList(entity: string): Promise<EntityInformation[]> {
    const entities = await this.getEntityMembers(entity)
    return Promise.all(entities.map((member) => this.getEntityInformation(member)))
  }

  authenticationMiddleware(): Array<{ path?: string; middleware: Array<RequestHandler> }> {
    return [
      {
        path: '/api/v2/token',
        middleware: [getTokenFromAuthHeader],
      },
      {
        path: '/api/v2',
        middleware: [getTokenFromAuthHeader, checkAuthentication],
      },
    ]
  }

  async getUserModelRoles(user: UserInterface, model: ModelDoc) {
    const entities = await this.getEntities(user)

    return model.collaborators
      .filter((collaborator) => entities.includes(collaborator.entity))
      .map((collaborator) => collaborator.roles)
      .flat()
  }
}
