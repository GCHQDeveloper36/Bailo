import { UserInterface } from '../../models/User.js'
import { fromEntity, toEntity } from '../../utils/entity.js'
import { BaseAuthenticationConnector, EntityInformation as EntityInformation, RoleKeys, Roles } from './Base.js'

const SillyEntityKind = {
  User: 'user',
  Group: 'group',
} as const

export class SillyAuthenticationConnector extends BaseAuthenticationConnector {
  constructor() {
    super()
  }

  authenticationMiddleware() {
    return [
      {
        path: '/api/v2',
        middleware: [
          function (req, res, next) {
            req.user = { dn: 'user' }
            return next()
          },
        ],
      },
      ...super.authenticationMiddleware(),
    ]
  }

  async hasRole(_user: UserInterface, role: RoleKeys) {
    if (role === Roles.Admin) {
      return true
    }
    return false
  }

  async queryEntities(_query: string) {
    return [
      {
        kind: SillyEntityKind.User,
        id: 'user',
      },
      {
        kind: SillyEntityKind.User,
        id: 'user2',
      },
      {
        kind: SillyEntityKind.Group,
        id: 'group1',
      },
      {
        kind: SillyEntityKind.Group,
        id: 'group2',
      },
    ]
  }

  async getEntities(user: UserInterface) {
    return [toEntity(SillyEntityKind.User, user.dn)]
  }

  async getEntityInformation(entity: string): Promise<EntityInformation> {
    const { kind, value } = fromEntity(entity)

    if (kind == SillyEntityKind.User) {
      return {
        kind,
        dn: value,
        email: `${value}@example.com`,
        name: 'Joe Bloggs',
        organisation: 'Acme Corp',
      }
    } else {
      // (kind == SillyEntityKind.Group)
      return {
        kind,
        dn: value,
        email: `${value}@example.com`,
        name: value,
      }
    }
  }

  async getEntityMembers(entity: string): Promise<string[]> {
    const { kind } = fromEntity(entity)
    switch (kind) {
      case SillyEntityKind.User:
        return [entity]
      case SillyEntityKind.Group:
        return [toEntity(SillyEntityKind.User, 'user'), toEntity(SillyEntityKind.User, 'user2')]
      default:
        throw new Error(`Unable to get members, entity kind not recognised: ${entity}`)
    }
  }
}
