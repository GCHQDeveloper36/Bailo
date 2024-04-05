import NodeClam from 'clamscan'
import { Readable } from 'stream'

import { getObjectStream, putObjectStream } from '../clients/s3.js'
import { FileAction } from '../connectors/authorisation/actions.js'
import authorisation from '../connectors/authorisation/index.js'
import FileModel, { ScanState } from '../models/File.js'
import { UserInterface } from '../models/User.js'
import config from '../utils/config.js'
import { Forbidden, NotFound } from '../utils/error.js'
import { longId } from '../utils/id.js'
import log from './log.js'
import { getModelById } from './model.js'
import { removeFileFromReleases } from './release.js'

let av: NodeClam

export async function uploadFile(
  user: UserInterface,
  modelId: string,
  name: string,
  mime: string,
  stream: ReadableStream,
) {
  const model = await getModelById(user, modelId)

  const fileId = longId()

  const bucket = config.s3.buckets.uploads
  const path = `beta/model/${modelId}/files/${fileId}`

  const file = new FileModel({ modelId, name, mime, bucket, path, complete: true })

  const auth = await authorisation.file(user, model, file, FileAction.Upload)
  if (!auth.success) {
    throw Forbidden(auth.info, { userDn: user.dn, fileId: file._id })
  }

  // Change this to an upsert operation
  const { fileSize } = await putObjectStream(bucket, path, stream)
  file.size = fileSize

  await file.save()

  if (config.avScanning.enabled) {
    if (!av) {
      av = await new NodeClam().init({ clamdscan: config.avScanning.clamdscan })
    }
    const avStream = av.passthrough()
    const s3Stream = (await getObjectStream(file.bucket, file.path)).Body as Readable
    s3Stream.pipe(avStream)
    log.info('Scan started.', { modelId, fileId: file._id, name })

    // What happens when scan is completed
    avStream.on('scan-complete', async (result) => {
      log.info('Scan complete.', { result, modelId, fileId: file._id, name })
      await file.update({
        avScan: { state: ScanState.Complete, isInfected: result.isInfected, viruses: result.viruses },
      })
    })
    avStream.on('error', async (error) => {
      log.error('Scan errored.', { error, modelId, fileId: file._id, name })
      await file.update({
        avScan: { state: ScanState.Error },
      })
    })
    avStream.on('timeout', async (error) => {
      log.error('Scan timed out.', { error, modelId, fileId: file._id, name })
      await file.update({
        avScan: { state: ScanState.Error },
      })
    })
  }

  return file
}

export async function downloadFile(user: UserInterface, fileId: string, range?: { start: number; end: number }) {
  const file = await getFileById(user, fileId)
  const model = await getModelById(user, file.modelId)

  const auth = await authorisation.file(user, model, file, FileAction.Download)
  if (!auth.success) {
    throw Forbidden(auth.info, { userDn: user.dn, fileId })
  }

  return getObjectStream(file.bucket, file.path, range)
}

export async function getFileById(user: UserInterface, fileId: string) {
  const file = await FileModel.findOne({
    _id: fileId,
  })

  if (!file) {
    throw NotFound(`The requested file was not found.`, { fileId })
  }

  const model = await getModelById(user, file.modelId)

  const auth = await authorisation.file(user, model, file, FileAction.View)
  if (!auth.success) {
    throw Forbidden(auth.info, { userDn: user.dn, fileId })
  }

  return file
}

export async function getFilesByModel(user: UserInterface, modelId: string) {
  const model = await getModelById(user, modelId)
  const files = await FileModel.find({ modelId })

  const auths = await authorisation.files(user, model, files, FileAction.View)
  return files.filter((_, i) => auths[i].success)
}

export async function getFilesByIds(user: UserInterface, modelId: string, fileIds: string[]) {
  const model = await getModelById(user, modelId)
  if (fileIds.length === 0) {
    return []
  }
  const files = await FileModel.find({ _id: { $in: fileIds } })

  if (files.length !== fileIds.length) {
    const notFoundFileIds = fileIds.filter((id) => files.some((file) => file._id.toString() === id))
    throw NotFound(`The requested files were not found.`, { fileIds: notFoundFileIds })
  }

  const auths = await authorisation.files(user, model, files, FileAction.View)
  return files.filter((_, i) => auths[i].success)
}

export async function removeFile(user: UserInterface, modelId: string, fileId: string) {
  const model = await getModelById(user, modelId)
  const file = await getFileById(user, fileId)

  const auth = await authorisation.file(user, model, file, FileAction.Delete)
  if (!auth.success) {
    throw Forbidden(auth.info, { userDn: user.dn })
  }

  await removeFileFromReleases(user, model, fileId)

  // We don't actually remove the file from storage, we only hide all
  // references to it.  This makes the file not visible to the user.
  await file.delete()

  return file
}
