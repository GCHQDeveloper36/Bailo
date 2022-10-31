import { UserDoc } from '../models/User'
import DeploymentModel from '../models/Deployment'
import RequestModel from '../models/Request'
import { VersionDoc } from '../models/Version'
import { deleteRegistryObjects } from '../services/deployment'
import ModelModel from '../models/Model'

export async function deleteVersionRequests(version: VersionDoc) {
  const versionRequests = await RequestModel.find({ version: version._id })
  await Promise.all(versionRequests.map((versionRequest) => versionRequest.delete()))
}

export async function deleteDeploymentsByVersion(version: VersionDoc, user: UserDoc) {
  const deployments = await DeploymentModel.find({ versions: { $in: [version._id] } })
  await Promise.all(
    deployments.map(async (deployment) => {
      await deleteRegistryObjects(deployment, user.id)
      await deployment.versions.remove(version._id)
      const deploymentRequests = await RequestModel.find({ deployment: deployment._id })
      await Promise.all(deploymentRequests.map((deploymentRequest) => deploymentRequest.delete()))
      if (deployment.versions.length === 0) {
        await deployment.delete()
      } else {
        await deployment.save()
      }
    })
  )
}

export async function deleteModelByVersion(version: VersionDoc) {
  const model = await ModelModel.findById(version.model)
  if (model) {
    await model.versions.remove(version._id)
    if (model.versions.length === 0) {
      await model.delete()
    } else {
      await model.save()
    }
  }
}
