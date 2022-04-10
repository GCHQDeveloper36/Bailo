import { MongoClient } from 'mongodb'
import config from 'config'
import { simpleEmail } from '../templates/simpleEmail'
import { sendEmail } from './smtp'
import PMongoQueue, { QueueMessage } from '../../lib/p-mongo-queue/pMongoQueue'
import { findVersionById, markVersionState } from '../services/version'
import { getUserByInternalId } from '../services/user'
import { findDeploymentById } from '../services/deployment'

let uploadQueue: PMongoQueue | undefined = undefined
let deploymentQueue: PMongoQueue | undefined = undefined
let mongoClient: MongoClient | undefined = undefined

export async function closeMongoInstance() {
  return mongoClient?.close()
}

export async function getMongoInstance() {
  if (mongoClient === undefined) {
    mongoClient = new MongoClient(await config.get('mongo.uri'))
    await mongoClient.connect()
  }

  return mongoClient
}

export async function getUploadQueue() {
  if (!uploadQueue) {
    const client = await getMongoInstance()
    const uploadDeadQueue = new PMongoQueue(client.db(), 'queue-uploads-dead')
    uploadQueue = new PMongoQueue(client.db(), 'queue-uploads', {
      deadQueue: uploadDeadQueue,
      maxRetries: 2,
      visibility: 60 * 9,
    })

    uploadQueue.on('succeeded', async (message: QueueMessage) => {
      await setUploadState(message, 'succeeded')
    })

    uploadQueue.on('retrying', async (message: QueueMessage, e: any) => {
      await setUploadState(message, 'retrying', e)
    })

    uploadQueue.on('failed', async (message: QueueMessage, e: any) => {
      await setUploadState(message, 'failed', e)
    })
  }

  return uploadQueue
}

export async function getDeploymentQueue() {
  if (!deploymentQueue) {
    const client = await getMongoInstance()
    const deploymentDeadQueue = new PMongoQueue(client.db(), 'queue-deployments-dead')
    deploymentQueue = new PMongoQueue(client.db(), 'queue-deployments', {
      deadQueue: deploymentDeadQueue,
      maxRetries: 2,
      visibility: 15,
    })

    deploymentQueue.on('succeeded', async (message: QueueMessage) => {
      await sendDeploymentEmail(message, 'succeeded')
    })

    deploymentQueue.on('retrying', async (message: QueueMessage, e: any) => {
      await sendDeploymentEmail(message, 'retrying', e)
    })

    deploymentQueue.on('failed', async (message: QueueMessage, e: any) => {
      await sendDeploymentEmail(message, 'failed', e)
    })
  }

  return deploymentQueue
}

async function setUploadState(msg: QueueMessage, state: string, _e?: any) {
  const user = await getUserByInternalId(msg.payload.userId)
  const version = await findVersionById(user, msg.payload.versionId, { populate: true })

  await markVersionState(user, msg.payload.versionId, state)

  if (!version.model.owner.email) {
    return
  }

  const message = state === 'retrying' ? 'failed but is retrying' : state
  const base = `${config.get('app.protocol')}://${config.get('app.host')}:${config.get('app.port')}`

  await sendEmail({
    to: version.model.owner.email,
    ...simpleEmail({
      text: `Your model build for '${version.model.currentMetadata.highLevelDetails.name}' has ${message}`,
      columns: [
        { header: 'Model Name', value: version.model.currentMetadata.highLevelDetails.name },
        { header: 'Build Type', value: 'Model' },
        { header: 'Status', value: state.charAt(0).toUpperCase() + state.slice(1) },
      ],
      buttons: [{ text: 'Build Logs', href: `${base}/model/${version.model.uuid}` }],
      subject: `Your model build for '${version.model.currentMetadata.highLevelDetails.name}' has ${message}`,
    }),
  })
}

async function sendDeploymentEmail(msg: QueueMessage, state: string, _e?: any) {
  const user = await getUserByInternalId(msg.payload.userId)
  const deployment = await findDeploymentById(user, msg.payload.deploymentId, { populate: true })

  if (!user.email) {
    return
  }

  const message = state === 'retrying' ? 'failed but is retrying' : state
  const base = `${config.get('app.protocol')}://${config.get('app.host')}:${config.get('app.port')}`

  await sendEmail({
    to: user.email,
    ...simpleEmail({
      text: `Your deployment for '${deployment.model.currentMetadata.highLevelDetails.name}' has ${message}`,
      columns: [
        { header: 'Model Name', value: deployment.model.currentMetadata.highLevelDetails.name },
        { header: 'Build Type', value: 'Deployment' },
        { header: 'Status', value: state.charAt(0).toUpperCase() + state.slice(1) },
      ],
      buttons: [{ text: 'Build Logs', href: `${base}/deployment/${deployment.uuid}` }],
      subject: `Your deployment for '${deployment.model.currentMetadata.highLevelDetails.name}' has ${message}`,
    }),
  })
}
