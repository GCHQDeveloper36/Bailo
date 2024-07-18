import { EntityObject, User } from 'types/types'

export const entitiesIncludesCurrentUser = (entities: EntityObject[], currentUser: User | undefined) => {
  return entities.some((entity) => entity.id === currentUser?.dn)
}

export const fromEntity = (entity: string) => {
  const [kind, ...values] = entity.split(':')
  return new EntityObject(kind, values.join(':'))
}
