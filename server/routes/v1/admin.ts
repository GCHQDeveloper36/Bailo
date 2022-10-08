import { Request, Response } from 'express'
import QueryString from 'qs'
import { getLogs, getLogType, LogType } from '../../services/logs'
import { BadReq } from '../../utils/result'
import { ensureUserRole } from '../../utils/user'

function parseDateQuery(
  queryDate: string | string[] | QueryString.ParsedQs | QueryString.ParsedQs[] | undefined,
  fallback: Date
): Date {
  if (typeof queryDate !== 'string') {
    return fallback
  }

  const date = Date.parse(queryDate)

  if (Number.isNaN(date)) {
    return fallback
  }

  return new Date(date)
}

function queryStringArrayTypeGuard(query: any): query is QueryString.ParsedQs[] {
  return Array.isArray(query) && typeof query[0] === 'object'
}

function parseQueryArray(
  property: string,
  query: string | string[] | QueryString.ParsedQs | QueryString.ParsedQs[] | undefined
): string[] {
  if (!query) {
    return []
  }

  if ((!Array.isArray(query) && typeof query !== 'string') || queryStringArrayTypeGuard(query)) {
    throw BadReq({ [property]: query }, `Should not pass an object to ${property}`)
  }

  if (!Array.isArray(query)) {
    return [query]
  }

  return query
}

function parseString(
  property: string,
  query: string | string[] | QueryString.ParsedQs | QueryString.ParsedQs[] | undefined
): string | undefined {
  if (query !== undefined && typeof query !== 'string') {
    throw BadReq({ [property]: query }, `Must pass a string to ${property}`)
  }

  return query
}

const isLogType = (item: LogType | undefined): item is LogType => !!item

export const getApplicationLogs = [
  ensureUserRole(['user', 'admin']),
  async (req: Request, res: Response) => {
    const after = parseDateQuery(req.query.after, new Date(0))
    const before = parseDateQuery(req.query.before, new Date(Date.now()))
    const level = parseInt(parseString('level', req.query.level) || '0', 10)

    if (Number.isNaN(level)) {
      throw BadReq({ level: req.query.level }, 'Level cannot be passed as number')
    }

    const filter = parseQueryArray('filter', req.query.filter)
    const types = filter.map((value) => getLogType(value)).filter(isLogType)

    if (types.length === 0) {
      throw BadReq({ types }, 'Error, provided no valid types')
    }

    const search = parseString('search', req.query.search)

    const isRegex = req.query.isRegex === 'true'

    const logs = await getLogs({ after, before, level, types, search, isRegex })

    res.json({
      logs: await logs.toArray(),
    })
  },
]

export const getItemLogs = [
  ensureUserRole(['user', 'admin']),
  async (req: Request, res: Response) => {
    const after = parseDateQuery(req.query.after, new Date(0))
    const before = parseDateQuery(req.query.before, new Date(Date.now()))
    const level = parseInt(parseString('level', req.query.level) || '0', 10)

    if (Number.isNaN(level)) {
      throw BadReq({ level: req.query.level }, 'Level cannot be passed as number')
    }

    const search = parseString('search', req.query.search)

    const isRegex = req.query.isRegex === 'true'

    let buildId
    if (req.params.buildId) {
      buildId = req.params.buildId
    }

    let requestId
    if (req.params.requestId) {
      requestId = req.params.requestId
    }

    const logs = await getLogs({ after, before, level, search, isRegex, buildId, requestId })

    res.json({
      logs: await logs.toArray(),
    })
  },
]
