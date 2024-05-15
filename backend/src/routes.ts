import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

import authentication from './connectors/authentication/index.js'
import { expressErrorHandler } from './routes/middleware/expressErrorHandler.js'
import { expressLogger } from './routes/middleware/expressLogger.js'
import { requestId } from './routes/middleware/requestId.js'
import { getDockerRegistryAuth } from './routes/v1/registryAuth.js'
import { getCurrentUser } from './routes/v2/entities/getCurrentUser.js'
import { getEntities } from './routes/v2/entities/getEntities.js'
import { getEntityLookup } from './routes/v2/entities/getEntityLookup.js'
import { deleteAccessRequest } from './routes/v2/model/accessRequest/deleteAccessRequest.js'
import { getAccessRequest } from './routes/v2/model/accessRequest/getAccessRequest.js'
import { getModelAccessRequests } from './routes/v2/model/accessRequest/getModelAccessRequests.js'
import { patchAccessRequest } from './routes/v2/model/accessRequest/patchAccessRequest.js'
import { postAccessRequest } from './routes/v2/model/accessRequest/postAccessRequest.js'
import { postAccessRequestComment } from './routes/v2/model/accessRequest/postAccessRequestComment.js'
import { deleteFile } from './routes/v2/model/file/deleteFile.js'
import { getDownloadFile } from './routes/v2/model/file/getDownloadFile.js'
import { getFiles } from './routes/v2/model/file/getFiles.js'
import { postFinishMultipartUpload } from './routes/v2/model/file/postFinishMultipartUpload.js'
import { postSimpleUpload } from './routes/v2/model/file/postSimpleUpload.js'
import { postStartMultipartUpload } from './routes/v2/model/file/postStartMultipartUpload.js'
import { getModel } from './routes/v2/model/getModel.js'
import { getModelsSearch } from './routes/v2/model/getModelsSearch.js'
import { getImages } from './routes/v2/model/images/getImages.js'
import { getInference } from './routes/v2/model/inferencing/getInferenceService.js'
import { getInferences } from './routes/v2/model/inferencing/getInferenceServices.js'
import { postInference } from './routes/v2/model/inferencing/postInferenceService.js'
import { putInference } from './routes/v2/model/inferencing/putInferenceService.js'
import { getModelCard } from './routes/v2/model/modelcard/getModelCard.js'
import { getModelCardRevisions } from './routes/v2/model/modelcard/getModelCardRevisions.js'
import { postFromSchema } from './routes/v2/model/modelcard/postFromSchema.js'
import { putModelCard } from './routes/v2/model/modelcard/putModelCard.js'
import { patchModel } from './routes/v2/model/patchModel.js'
import { postModel } from './routes/v2/model/postModel.js'
import { postRequestExportToS3 } from './routes/v2/model/postRequestExport.js'
import { getModelCurrentUserRoles } from './routes/v2/model/roles/getModelCurrentUserRoles.js'
import { getModelRoles } from './routes/v2/model/roles/getModelRoles.js'
import { deleteWebhook } from './routes/v2/model/webhook/deleteWebhook.js'
import { getWebhooks } from './routes/v2/model/webhook/getWebhooks.js'
import { postWebhook } from './routes/v2/model/webhook/postWebhook.js'
import { putWebhook } from './routes/v2/model/webhook/putWebhook.js'
import { deleteRelease } from './routes/v2/release/deleteRelease.js'
import { getRelease } from './routes/v2/release/getRelease.js'
import { getReleases } from './routes/v2/release/getReleases.js'
import { postRelease } from './routes/v2/release/postRelease.js'
import { postReleaseComment } from './routes/v2/release/postReleaseComment.js'
import { putRelease } from './routes/v2/release/putRelease.js'
import { getReviews } from './routes/v2/review/getReviews.js'
import { patchAccessRequestReviewResponse } from './routes/v2/review/patchAccessRequestReviewResponse.js'
import { patchReleaseReviewResponse } from './routes/v2/review/patchReleaseReviewResponse.js'
import { postAccessRequestReviewResponse } from './routes/v2/review/postAccessRequestReviewResponse.js'
import { postReleaseReviewResponse } from './routes/v2/review/postReleaseReviewResponse.js'
import { deleteSchema } from './routes/v2/schema/deleteSchema.js'
import { getSchema } from './routes/v2/schema/getSchema.js'
import { getSchemas } from './routes/v2/schema/getSchemas.js'
import { patchSchema } from './routes/v2/schema/patchSchema.js'
import { postSchema } from './routes/v2/schema/postSchema.js'
import { getSpecification } from './routes/v2/specification.js'
import { patchTeam } from './routes/v2/team/getMyTeams.js'
import { getTeam } from './routes/v2/team/getTeam.js'
import { getTeams } from './routes/v2/team/getTeams.js'
import { postTeam } from './routes/v2/team/postTeam.js'
import { getUiConfig } from './routes/v2/uiConfig/getUiConfig.js'
import { deleteUserToken } from './routes/v2/user/deleteUserToken.js'
import { getUserTokens } from './routes/v2/user/getUserTokens.js'
import { postUserToken } from './routes/v2/user/postUserToken.js'
import config from './utils/config.js'

export const server = express()

server.use('/api/v2', requestId)
server.use('/api/v2', expressLogger)
const middlewareConfigs = authentication.authenticationMiddleware()
for (const middlewareConf of middlewareConfigs) {
  server.use(middlewareConf?.path || '/', middlewareConf.middleware)
}

server.get('/api/v1/registry_auth', ...getDockerRegistryAuth)

server.post('/api/v2/models', ...postModel)
server.get('/api/v2/models/search', ...getModelsSearch)
// server.post('/api/v2/models/import', ...postModelImport)

server.get('/api/v2/model/:modelId', ...getModel)
server.patch('/api/v2/model/:modelId', ...patchModel)

server.post('/api/v2/model/:modelId/export/s3', ...postRequestExportToS3)

server.get('/api/v2/model/:modelId/model-card/:version', ...getModelCard)
server.get('/api/v2/model/:modelId/model-card-revisions', ...getModelCardRevisions)
server.put('/api/v2/model/:modelId/model-cards', ...putModelCard)

// *server.get('/api/v2/template/models', ...getModelTemplates)
// *server.post('/api/v2/model/:modelId/setup/from-template', ...postFromTemplate)
// *server.post('/api/v2/model/:modelId/setup/from-existing', ...postFromExisting)
server.post('/api/v2/model/:modelId/setup/from-schema', ...postFromSchema)

server.post('/api/v2/model/:modelId/releases', ...postRelease)
server.get('/api/v2/model/:modelId/releases', ...getReleases)
server.get('/api/v2/model/:modelId/release/:semver', ...getRelease)
server.get('/api/v2/model/:modelId/release/:semver/file/:fileName/download', ...getDownloadFile)
// This is a temporary workaround to split out the URL to disable authorisation.
server.get('/api/v2/token/model/:modelId/release/:semver/file/:fileName/download', ...getDownloadFile)
server.put('/api/v2/model/:modelId/release/:semver', ...putRelease)
server.post('/api/v2/model/:modelId/release/:semver/comment', ...postReleaseComment)
server.delete('/api/v2/model/:modelId/release/:semver', ...deleteRelease)
server.post('/api/v2/model/:modelId/release/:semver/review', ...postReleaseReviewResponse)
server.patch('/api/v2/model/:modelId/release/:semver/review', ...patchReleaseReviewResponse)

server.post('/api/v2/model/:modelId/access-requests', ...postAccessRequest)
server.get('/api/v2/model/:modelId/access-requests', getModelAccessRequests)
server.get('/api/v2/model/:modelId/access-request/:accessRequestId', ...getAccessRequest)
server.delete('/api/v2/model/:modelId/access-request/:accessRequestId', ...deleteAccessRequest)
server.patch('/api/v2/model/:modelId/access-request/:accessRequestId', ...patchAccessRequest)
server.post('/api/v2/model/:modelId/access-request/:accessRequestId/comment', ...postAccessRequestComment)
server.post('/api/v2/model/:modelId/access-request/:accessRequestId/review', ...postAccessRequestReviewResponse)
server.patch('/api/v2/model/:modelId/access-request/:accessRequestId/review', ...patchAccessRequestReviewResponse)

server.get('/api/v2/model/:modelId/files', ...getFiles)
server.get('/api/v2/model/:modelId/file/:fileId/download', ...getDownloadFile)
// This is a temporary workaround to split out the URL to disable authorisation.
server.get('/api/v2/token/model/:modelId/file/:fileId/download', ...getDownloadFile)
server.post('/api/v2/model/:modelId/files/upload/simple', ...postSimpleUpload)
server.post('/api/v2/model/:modelId/files/upload/multipart/start', ...postStartMultipartUpload)
server.post('/api/v2/model/:modelId/files/upload/multipart/finish', ...postFinishMultipartUpload)
server.delete('/api/v2/model/:modelId/file/:fileId', ...deleteFile)
server.post('/api/v2/model/:modelId/releases', ...postRelease)
server.get('/api/v2/model/:modelId/releases', ...getReleases)
server.get('/api/v2/model/:modelId/release/:semver', ...getRelease)
server.get('/api/v2/model/:modelId/release/:semver/file/:fileName/download', ...getDownloadFile)
// This is a temporary workaround to split out the URL to disable authorisation.
server.get('/api/v2/token/model/:modelId/release/:semver/file/:fileName/download', ...getDownloadFile)
server.put('/api/v2/model/:modelId/release/:semver', ...putRelease)
server.post('/api/v2/model/:modelId/release/:semver/comment', ...postReleaseComment)
server.delete('/api/v2/model/:modelId/release/:semver', ...deleteRelease)
server.post('/api/v2/model/:modelId/release/:semver/review', ...postReleaseReviewResponse)

server.post('/api/v2/model/:modelId/webhooks', ...postWebhook)
server.get('/api/v2/model/:modelId/webhooks', ...getWebhooks)
server.put('/api/v2/model/:modelId/webhook/:webhookId', ...putWebhook)
server.delete('/api/v2/model/:modelId/webhook/:webhookId', ...deleteWebhook)

server.get('/api/v2/model/:modelId/images', ...getImages)
// *server.delete('/api/v2/model/:modelId/images/:imageId', ...deleteImage)
server.get('/api/v2/model/:modelId/files', ...getFiles)
server.get('/api/v2/model/:modelId/file/:fileId/download', ...getDownloadFile)
// This is a temporary workaround to split out the URL to disable authorisation.
server.get('/api/v2/token/model/:modelId/file/:fileId/download', ...getDownloadFile)
server.post('/api/v2/model/:modelId/files/upload/simple', ...postSimpleUpload)
server.post('/api/v2/model/:modelId/files/upload/multipart/start', ...postStartMultipartUpload)
server.post('/api/v2/model/:modelId/files/upload/multipart/finish', ...postFinishMultipartUpload)
server.delete('/api/v2/model/:modelId/file/:fileId', ...deleteFile)

// Inferencing routes are conditional to Bailo specific configuration
// NOTE: Enabled if config not loaded for testing purposes
if (!config.inference || config.inference?.enabled) {
  server.get('/api/v2/model/:modelId/inferences', ...getInferences)
  server.get('/api/v2/model/:modelId/inference/:image/:tag', ...getInference)
  server.post('/api/v2/model/:modelId/inference', ...postInference)
  server.put('/api/v2/model/:modelId/inference/:image/:tag', ...putInference)
}
// *server.get('/api/v2/model/:modelId/release/:semver/file/:fileCode/list', ...getModelFileList)
// *server.get('/api/v2/model/:modelId/release/:semver/file/:fileCode/raw', ...getModelFileRaw)

server.get('/api/v2/schemas', ...getSchemas)
server.get('/api/v2/schema/:schemaId', ...getSchema)
server.post('/api/v2/schemas', ...postSchema)
server.patch('/api/v2/schema/:schemaId', ...patchSchema)
server.delete('/api/v2/schema/:schemaId', ...deleteSchema)

server.get('/api/v2/reviews', ...getReviews)

server.get('/api/v2/model/:modelId/roles', ...getModelRoles)
server.get('/api/v2/model/:modelId/roles/mine', ...getModelCurrentUserRoles)

server.post('/api/v2/teams', ...postTeam)
server.get('/api/v2/teams', ...getTeams)
server.get('/api/v2/teams/mine', ...getTeams)

server.get('/api/v2/team/:teamId', ...getTeam)
server.patch('/api/v2/team/:teamId', ...patchTeam)

// server.post('/api/v2/teams/:teamId/members', ...postTeamMember)
// server.get('/api/v2/teams/:teamId/members', ...getTeamMembers)
// server.delete('/api/v2/teams/:teamId/members/:memberId', ...deleteTeamMember)
// server.patch('/api/v2/teams/:teamId/members/:memberId', ...patchTeamMember)

// server.get('/api/v2/teams/:teamId/roles/:memberId', ...getTeamMemberRoles)

server.get('/api/v2/entities', ...getEntities)
server.get('/api/v2/entities/me', ...getCurrentUser)
server.get('/api/v2/entity/:dn/lookup', ...getEntityLookup)

server.get('/api/v2/config/ui', ...getUiConfig)

server.post('/api/v2/user/tokens', ...postUserToken)
server.get('/api/v2/user/tokens', ...getUserTokens)
// server.get('/api/v2/user/:userId/token/:tokenId', ...getUserToken)
server.delete('/api/v2/user/token/:accessKey', ...deleteUserToken)

server.get('/api/v2/specification', ...getSpecification)

// Python docs
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
server.use('/docs/python', express.static(path.join(__dirname, '../python-docs/_build/dirhtml')))

server.use('/api/v2', expressErrorHandler)
