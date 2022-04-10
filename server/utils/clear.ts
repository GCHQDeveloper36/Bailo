import DeploymentModel from '../models/Deployment'
import RequestModel from '../models/Request'
import ModelModel from '../models/Model'
import UserModel from '../models/User'
import VersionModel from '../models/Version'

import { connectToMongoose, disconnectFromMongoose } from './database'

import config from 'config'
import { emptyBucket } from './minio'

const pause = (time) => new Promise((resolve) => setTimeout(resolve, time))

export async function clearStoredData() {
  await connectToMongoose()

  await Promise.all([
    // delete all files from mongo
    DeploymentModel.deleteMany({}),
    RequestModel.deleteMany({}),
    ModelModel.deleteMany({}),
    UserModel.deleteMany({}),
    VersionModel.deleteMany({}),

    // empty minio buckets
    emptyBucket(config.get('minio.uploadBucket')),
    emptyBucket(config.get('minio.registryBucket')),
  ])

  // small pause to ensure Mongoose has finished
  await pause(250)
  await disconnectFromMongoose()
}
