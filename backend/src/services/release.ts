import semver from 'semver'
import { Optional } from 'utility-types'

import { ReleaseAction } from '../connectors/authorisation/actions.js'
import authorisation from '../connectors/authorisation/index.js'
import { FileInterface } from '../models/File.js'
import { ModelDoc, ModelInterface } from '../models/Model.js'
import Release, { ImageRef, ReleaseDoc, ReleaseInterface, SemverObject } from '../models/Release.js'
import ResponseModel, { ResponseKind } from '../models/Response.js'
import { UserInterface } from '../models/User.js'
import { WebhookEvent } from '../models/Webhook.js'
import { isBailoError } from '../types/error.js'
import { findDuplicates } from '../utils/array.js'
import { toEntity } from '../utils/entity.js'
import { BadReq, Forbidden, InternalError, NotFound } from '../utils/error.js'
import { isMongoServerError } from '../utils/mongo.js'
import { getFileById, getFilesByIds } from './file.js'
import log from './log.js'
import { getModelById, getModelCardRevision } from './model.js'
import { listModelImages } from './registry.js'
import { createReleaseReviews } from './review.js'
import { sendWebhooks } from './webhook.js'

async function validateRelease(user: UserInterface, model: ModelDoc, release: ReleaseDoc) {
  if (!semver.valid(release.semver)) {
    throw BadReq(`The version '${release.semver}' is not a valid semver value.`)
  }

  if (release.images) {
    const registryImages = await listModelImages(user, release.modelId)

    const initialValue: ImageRef[] = []
    const missingImages = release.images.reduce((acc, releaseImage) => {
      if (
        !registryImages.some(
          (registryImage) =>
            releaseImage.name === registryImage.name &&
            releaseImage.repository === registryImage.repository &&
            registryImage.tags.includes(releaseImage.tag),
        )
      ) {
        acc.push(releaseImage)
      }
      return acc
    }, initialValue)

    if (missingImages.length > 0) {
      throw BadReq('The following images do not exist in the registry.', {
        missingImages,
      })
    }
  }

  if (release.fileIds) {
    const fileNames: Array<string> = []

    for (const fileId of release.fileIds) {
      let file
      try {
        file = await getFileById(user, fileId)
      } catch (e) {
        if (isBailoError(e) && e.code === 404) {
          throw BadReq('Unable to create release as the file cannot be found.', { fileId })
        }
        throw e
      }
      fileNames.push(file.name)

      if (file.modelId !== model.id) {
        throw BadReq(
          `The file '${fileId}' comes from the model '${file.modelId}', but this release is being created for '${model.id}'`,
          {
            modelId: model.id,
            fileId: fileId,
            fileModelId: file.modelId,
          },
        )
      }
    }

    const uniqueDuplicates = [...new Set(findDuplicates(fileNames))]
    if (uniqueDuplicates.length) {
      throw BadReq(
        `Releases cannot have multiple files with the same name.  The duplicates in this file are: '${JSON.stringify(
          uniqueDuplicates,
        )}'`,
        {
          fileNames,
          duplicates: uniqueDuplicates,
        },
      )
    }
  }
}

export type CreateReleaseParams = Optional<
  Pick<
    ReleaseInterface,
    'modelId' | 'modelCardVersion' | 'semver' | 'notes' | 'minor' | 'draft' | 'fileIds' | 'images'
  >,
  'modelCardVersion'
>
export async function createRelease(user: UserInterface, releaseParams: CreateReleaseParams) {
  const model = await getModelById(user, releaseParams.modelId)
  if (model.settings.mirror.sourceModelId) {
    throw BadReq(`Cannot create a release from a mirrored model.`)
  }

  if (releaseParams.modelCardVersion) {
    // Ensure that the requested model card version exists.
    await getModelCardRevision(user, releaseParams.modelId, releaseParams.modelCardVersion)
  } else {
    if (!model.card) {
      throw BadReq('This model does not have a model card associated with it yet.', { modelId: model.id })
    }

    releaseParams.modelCardVersion = model.card?.version
  }

  // There is a typing error whereby mongoose-delete plugin functions are not
  // found by the TS compiler.
  const ReleaseModelWithDelete = Release as any
  const deletedRelease = await ReleaseModelWithDelete.findOneWithDeleted({
    modelId: releaseParams.modelId,
    semver: releaseParams.semver,
  })
  if (deletedRelease) {
    throw BadReq(
      'A release using this semver has been deleted. Please use a different semver or contact an admin to restore the deleted release.',
    )
  }

  const release = new Release({
    createdBy: user.dn,
    ...releaseParams,
  })

  await validateRelease(user, model, release)

  const auth = await authorisation.release(user, model, release, ReleaseAction.Create)
  if (!auth.success) {
    throw Forbidden(auth.info, {
      userDn: user.dn,
      modelId: releaseParams.modelId,
    })
  }

  try {
    await release.save()
  } catch (error) {
    if (isMongoServerError(error) && error.code === 11000) {
      throw BadReq(`A release with this semver already exists for this model.`, {
        modelId: releaseParams.modelId,
        semver: releaseParams.semver,
      })
    }

    throw error
  }

  if (!release.minor) {
    try {
      await createReleaseReviews(model, release)
    } catch (error) {
      // Transactions here would solve this issue.
      log.warn(error, 'Error when creating Release Review Requests. Approval cannot be given to this release')
    }
  }

  sendWebhooks(
    release.modelId,
    WebhookEvent.CreateRelease,
    `Release ${release.semver} has been created for model ${release.modelId}`,
    { release },
  )

  return release
}

export type UpdateReleaseParams = Pick<ReleaseInterface, 'notes' | 'draft' | 'fileIds' | 'images'>
export async function updateRelease(user: UserInterface, modelId: string, semver: string, delta: UpdateReleaseParams) {
  const model = await getModelById(user, modelId)
  if (model.settings.mirror.sourceModelId) {
    throw BadReq(`Cannot update a release on a mirrored model.`)
  }
  const release = await getReleaseBySemver(user, modelId, semver)

  Object.assign(release, delta)
  await validateRelease(user, model, release)

  const auth = await authorisation.release(user, model, release, ReleaseAction.Update)
  if (!auth.success) {
    throw Forbidden(auth.info, {
      userDn: user.dn,
      modelId: modelId,
    })
  }

  const updatedRelease = await Release.findOneAndUpdate({ modelId, semver }, { $set: release })

  if (!updatedRelease) {
    throw NotFound(`The requested release was not found.`, { modelId, semver })
  }

  return updatedRelease
}

export async function newReleaseComment(user: UserInterface, modelId: string, semver: string, comment: string) {
  const model = await getModelById(user, modelId)
  if (model.settings.mirror.sourceModelId) {
    throw BadReq(`Cannot create a new comment on a mirrored model.`)
  }

  const release = await Release.findOne({ modelId, semver })
  if (!release) {
    throw NotFound(`The requested release was not found.`, { modelId, semver })
  }

  // Store the response
  const commentResponse = new ResponseModel({
    entity: toEntity('user', user.dn),
    kind: ResponseKind.Comment,
    comment,
    createdAt: new Date().toISOString(),
    parentId: release._id,
  })

  const savedComment = await commentResponse.save()

  if (!savedComment) {
    throw InternalError('There was a problem saving this release comment')
  }

  return commentResponse
}

export async function getModelReleases(
  user: UserInterface,
  modelId: string,
  q?: string,
): Promise<Array<ReleaseDoc & { model: ModelInterface; files: FileInterface[] }>> {
  const query = q === undefined ? { modelId } : getQuerySyntax(q, modelId)
  const results = await Release.aggregate()
    .match(query!)
    .sort({ updatedAt: -1 })
    .lookup({ from: 'v2_models', localField: 'modelId', foreignField: 'id', as: 'model' })
    .append({ $set: { model: { $arrayElemAt: ['$model', 0] } } })
    .lookup({ from: 'v2_files', localField: 'fileIds', foreignField: '_id', as: 'files' })

  const model = await getModelById(user, modelId)

  const auths = await authorisation.releases(user, model, results, ReleaseAction.View)
  return results
    .filter((_, i) => auths[i].success)
    .map((result) => ({ ...result, semver: semverObjectToString(result.semver) }))
}

export async function getReleasesForExport(user: UserInterface, modelId: string, semvers: string[]) {
  const model = await getModelById(user, modelId)
  const releases = await Release.find({
    modelId,
    semver: semvers,
  })

  const missing = semvers.filter((x) => !releases.some((release) => release.semver === x))
  if (missing.length > 0) {
    throw NotFound('The following releases were not found.', { modelId, releases: missing })
  }

  const auths = await authorisation.releases(user, model, releases, ReleaseAction.Update)
  const noAuth = releases.filter((_, i) => !auths[i].success)
  if (noAuth.length > 0) {
    throw Forbidden('You do not have the necessary permissions to export these releases.', {
      modelId,
      releases: noAuth.map((release) => release.semver),
      user,
    })
  }

  return releases
}

export function semverStringToObject(semver: string) {
  const vIdentifierIndex = semver.indexOf('v')
  const trimmedSemver = vIdentifierIndex === -1 ? semver : semver.slice(vIdentifierIndex + 1)
  const [version, metadata] = trimmedSemver.split('-')
  const [major, minor, patch] = version.split('.')
  const majorNum: number = Number(major)
  const minorNum: number = Number(minor)
  const patchNum: number = Number(patch)
  return { major: majorNum, minor: minorNum, patch: patchNum, ...(metadata && { metadata }) }
}

export function semverObjectToString(semver: SemverObject) {
  let metadata: string
  if (semver.metadata != undefined) {
    metadata = `-${semver.metadata}`
  } else {
    metadata = ``
  }
  return `${semver.major}.${semver.minor}.${semver.patch}${metadata}`
}

function getSemverVariations(querySemver: string) {
  const semverObj = semverStringToObject(querySemver)
  const trimmedSemver =
    querySemver.charAt(0) === '^' || querySemver.charAt(0) === '~' ? querySemver.slice(1) : querySemver
  return { semverObj, trimmedSemver }
}

export async function getReleaseBySemver(user: UserInterface, modelId: string, semver: string) {
  const model = await getModelById(user, modelId)
  const semverObj = semverStringToObject(semver)
  const release = await Release.findOne({
    modelId,
    semver: semverObj,
  })

  if (!release) {
    throw NotFound(`The requested release was not found.`, { modelId, semver })
  }

  const auth = await authorisation.release(user, model, release, ReleaseAction.View) // TODO change this to .releases and then check change auth success to map over multiple releases
  if (!auth.success) {
    throw Forbidden(auth.info, { userDn: user.dn, release: release._id })
  }

  return release
}

function getQuerySyntax(querySemver: string | undefined, modelID: string) {
  //NOTE if we are adding advanced query for range, we ignore metadata as they aren't currently supported by our range query functionality
  if (querySemver === undefined) {
    return {
      modelId: modelID,
    }
  }

  const isSemverValid = semver.validRange(querySemver, { includePrerelease: true })

  if (!isSemverValid) {
    throw BadReq(`Semver ('${querySemver}') is invalid `)
  }
  // let trimmedSemver
  // if (querySemver.charAt(0) === '^' || querySemver.charAt(0) === '~') {
  //   trimmedSemver = querySemver.slice(1)
  // } else {
  //   trimmedSemver = querySemver
  // }

  // const semverObj = semverStringToObject(trimmedSemver)
  //TODO INCLUDE CHECK THAT X IS ALWAYS AFTER A NUMBER, NEVER PRECEEDES OTHERWISE IT IS INCORRECT SYNTAX

  const { semverObj, trimmedSemver } = getSemverVariations(querySemver)

  if (querySemver.includes('x') || querySemver.includes('X') || querySemver.includes('*')) {
    const newSemver = querySemver.replace('X', 'x').replace('*', 'x')
    //return query for x range
    const splitSemver = newSemver.split('.')
    if (splitSemver[0].includes('x')) {
      return {
        modelId: modelID,
      }
    } else if (splitSemver[1].includes('x')) {
      return {
        modelId: modelID,
        'semver.major': semverObj.major,
      }
    } else {
      return {
        modelId: modelID,
        'semver.major': semverObj.major,
        'semver.minor': semverObj.minor,
      }
    }
  } else if (querySemver.includes('^')) {
    //return query CARET RANGE
    const splitSemver = trimmedSemver.split('.')
    if (splitSemver[0] === '0') {
      if (splitSemver[1] === '0') {
        if (splitSemver[2] === '0') {
          //What to put here? Is it invalid?
          throw BadReq(`The semver range '${querySemver}' is not valid. Must not contain all 0 values. `)
        }
        return {
          modelId: modelID,
          semver: semverObj,
          // This is equivalent to grabbing one specific release
          //but it may have caveats in the future with the possible, future inclusion of pre-release identifiers etc
        }
      }
      return {
        modelId: modelID,
        'semver.major': 0,
        'semver.minor': semverObj.minor,
        'semver.patch': { $gte: semverObj.patch },
      }
    } else {
      //normal
      //Invalid?
      //   //Check for all
      //   return {
      //     modelId: modelID,
      //     semver: semverObj, //Keep this or just remove, this would mean all releases would be returned if this is used in find()
      //   }
    }
  } else if (querySemver.includes('~')) {
    //return query TILDE RANGE
    const splitSemver = trimmedSemver.split('.') //THINK THIS COULD BE IMPROVED
    const count = splitSemver.length
    switch (count) {
      case 1: {
        return {
          modelId: modelID,
          'semver.major': semverObj.major,
        }
        break
      }
      case 2: {
        return {
          modelId: modelID,
          'semver.major': semverObj.major,
          'semver.minor': semverObj.minor,
        }
        break
      }
      case 3: {
        return {
          modelId: modelID,
          'semver.major': semverObj.major,
          'semver.minor': semverObj.minor,
          'semver.patch': { $gte: semverObj.patch },
        }
        break
      }
    }
  } else if (querySemver.includes('-')) {
    //get before hyphen
    //get after hyphen
    const [lowerSemver, upperSemver] = trimmedSemver.split('-')
    const lowerSemverObj = semverStringToObject(lowerSemver)
    const upperSemverObj = semverStringToObject(upperSemver)
    //return query HYPEN RANGE
    return {
      modelId: modelID,
      $and: [
        {
          $or: [
            {
              'semver.major': { $gte: lowerSemverObj.major },
              'semver.minor': { $gte: lowerSemverObj.minor },
              'semver.patch': { $gte: lowerSemverObj.patch },
            },
            {
              'semver.major': { $gt: lowerSemverObj.major },
            },
            {
              'semver.major': { $gte: lowerSemverObj.major },
              'semver.minor': { $gt: lowerSemverObj.minor },
            },
          ],
        },
        {
          $or: [
            {
              'semver.major': { $lte: upperSemverObj.major },
              'semver.minor': { $lte: upperSemverObj.minor },
              'semver.patch': { $lt: upperSemverObj.patch },
            },
            {
              'semver.major': { $lt: upperSemverObj.major },
            },
            {
              'semver.major': { $lte: upperSemverObj.major },
              'semver.minor': { $lt: upperSemverObj.minor },
            },
          ],
        },
      ],
    }
  } else {
    throw BadReq(
      `The semver range '${querySemver}' is not valid. IF you were looking for specific releases then use the /release api endpoint.`,
    )
  }
}

// export async function getReleaseBySemverLatest(user: UserInterface, modelID: string, semver: string) {
//   const model = await getModelById(user, modelID)

//   const query = getQuerySyntax(semver, modelID)
//   const release = await Release.findOne(query)

//   if (!release) {
//     throw NotFound(`The requested release was not found.`, { modelID, semver })
//   }

//   const auth = await authorisation.release(user, model, release, ReleaseAction.View)
//   if (!auth.success) {
//     throw Forbidden(auth.info, { userDn: user.dn, release: release._id })
//   }

//   return release
// }

export async function deleteRelease(user: UserInterface, modelId: string, semver: string) {
  const model = await getModelById(user, modelId)
  if (model.settings.mirror.sourceModelId) {
    throw BadReq(`Cannot delete a release on a mirrored model.`)
  }
  const release = await getReleaseBySemver(user, modelId, semver)

  const auth = await authorisation.release(user, model, release, ReleaseAction.Delete)
  if (!auth.success) {
    throw Forbidden(auth.info, { userDn: user.dn, release: release._id })
  }

  await release.delete()

  return { modelId, semver }
}

export function getReleaseName(release: ReleaseDoc): string {
  return `${release.modelId} - v${release.semver}`
}

export async function removeFileFromReleases(user: UserInterface, model: ModelDoc, fileId: string) {
  if (model.settings.mirror.sourceModelId) {
    throw BadReq(`Cannot remove a file from a mirrored model.`)
  }

  const query = {
    modelId: model.id,
    // Match documents where the element exists in the array
    fileIds: fileId,
  }
  const releases = await Release.find(query)

  const responses = await authorisation.releases(user, model, releases, ReleaseAction.Update)
  const failures = responses.filter((response) => !response.success)

  if (failures.length) {
    throw Forbidden(`You do not have permission to update these releases.`, {
      releases: failures.map((failure) => failure.id),
    })
  }

  const result = await Release.updateMany(query, {
    $pull: { fileIds: fileId },
  })

  return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }
}

export async function getFileByReleaseFileName(user: UserInterface, modelId: string, semver: string, fileName: string) {
  const release = await getReleaseBySemver(user, modelId, semver)
  const files = await getFilesByIds(user, modelId, release.fileIds)

  const file = files.find((file) => file.name === fileName)

  if (!file) {
    throw NotFound(`The requested file name was not found on the release.`, { modelId, semver, fileName })
  }

  return file
}

export async function getAllFileIds(modelId: string, semvers: string[]) {
  const result = await Release.aggregate()
    .match({ modelId, semver: { $in: semvers } })
    .unwind({ path: '$fileIds' })
    .group({
      _id: null,
      fileIds: {
        $addToSet: '$fileIds',
      },
    })
  if (result.at(0)) {
    return result.at(0).fileIds
  }
  return []
}
