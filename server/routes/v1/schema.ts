import SchemaModel from '../../models/Schema'
import { Request, Response } from 'express'
import { ensureUserRole } from '../../utils/user'
import { NotFound } from '../../utils/result'

export const getSchemas = [
  ensureUserRole('user'),
  async (req: Request, res: Response) => {
    if (!req.query.use) {
      throw NotFound({code: 'use_field_missing_in_request'}, `Requires 'use' field to be provided.`)
    }

    const schemas = await SchemaModel.find({ use: req.query.use })

    req.log.info({ code: 'fetching_schemas', schemas }, 'User fetching schemas')
    return res.json(schemas)
  },
]

export const getDefaultSchema = [
  ensureUserRole('user'),
  async (req: Request, res: Response) => {
    if (!req.query.use) {
      throw NotFound({ code: 'use_field_missing_in_request' }, `Requires 'use' field to be provided`)
    }

    const schema = await SchemaModel.find({ use: req.query.use }).sort({ createdAt: -1 }).limit(1)

    if (!schema.length) {
      throw NotFound({ code: 'default_schema_not_found' }, `Could not find default schema`)
    }

    req.log.info({ code: 'fetching_default_schema', schema }, 'User fetching default schema')
    return res.json(schema[0])
  },
]

export const getSchema = [
  ensureUserRole('user'),
  async (req: Request, res: Response) => {
    const { ref } = req.params

    const schema = await SchemaModel.findOne({ reference: decodeURIComponent(ref) })

    if (!schema) {
      req.log.warn({ code: 'schema_not_found', use: req.query.use }, `Could not find given schema`)
      return res.status(404).json({
        message: 'No schema found.',
      })
    }

    req.log.info({ code: 'fetching_schema_by_reference', schema }, 'User fetching schema using specified reference')
    return res.json(schema)
  },
]
