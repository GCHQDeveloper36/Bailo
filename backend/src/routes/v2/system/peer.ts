import { Request, Response } from 'express'
import { z } from 'zod'

import { getPeerConnectors } from '../../../connectors/peer/index.js'
import { peersConfigStatusSchema, registerPath } from '../../../services/specification.js'
import { RemoteFederationConfig, SystemStatus } from '../../../types/types.js'
import { InternalError } from '../../../utils/error.js'
import { parse } from '../../../utils/validate.js'

export const getPeerSchema = z.object({
  params: z.object({
    peerId: z.string().openapi({ example: 'huggingface' }),
  }),
})

registerPath({
  method: 'get',
  path: '/api/v2/system/peer/{peerId}',
  tags: ['system'],
  description: 'Get the peer connectivity status',
  schema: getPeerSchema,
  responses: {
    200: {
      description: 'Details about the peers of this system',
      content: {
        'application/json': {
          schema: peersConfigStatusSchema,
        },
      },
    },
  },
})

interface GetPeerResponse {
  peer: RemoteFederationConfig
  status: SystemStatus
}

export const getPeerStatus = [
  async (req: Request, res: Response<GetPeerResponse>): Promise<void> => {
    const { params } = parse(req, getPeerSchema)
    const peersWrapper = await getPeerConnectors()
    const peer = peersWrapper.peers.get(params.peerId)
    if (!peer) {
      throw InternalError('Unable to load peer', {
        peerId: params.peerId,
      })
    }
    const peerConfig = peer.getConfig()
    const peerStatus = await peer.getPeerStatus()

    res.json({
      peer: peerConfig,
      status: peerStatus,
    })
  },
]
