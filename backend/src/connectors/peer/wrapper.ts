import { EntryKindKeys, ExternalModelInterface } from '../../models/Model.js'
import { UserInterface } from '../../models/User.js'
import { EntrySearchOptionsParams, EntrySearchResultWithErrors, PeerConfigStatus } from '../../types/types.js'
import { InternalError } from '../../utils/error.js'
import { BasePeerConnector } from './base.js'

export class PeerConnectorWrapper {
  peers: Map<string, BasePeerConnector>
  peerIds: Array<string>

  constructor(peers: Map<string, BasePeerConnector>) {
    this.peers = new Map(peers)
    this.peerIds = Array.from(peers.keys())
  }

  private getPeersOrThrow(ids: Array<string>): Array<[string, BasePeerConnector]> {
    const resolved: Array<[string, BasePeerConnector]> = []
    const missing: string[] = []

    for (const id of ids) {
      const peer = this.peers.get(id)
      if (!peer) {
        missing.push(id)
      } else {
        resolved.push([id, peer])
      }
    }

    if (missing.length) {
      throw InternalError('Invalid peer IDs provided', { ids: missing })
    }

    return resolved
  }

  private getPeerOrThrow(id: string): BasePeerConnector {
    const peer = this.peers.get(id)
    if (!peer) {
      throw InternalError('Invalid peer ID provided', { id })
    }
    return peer
  }

  async init() {
    await Promise.all(Array.from(this.peers.values()).map((peer) => peer.init()))
  }

  async status(peersToQuery: Array<string> = this.peerIds): Promise<Map<string, PeerConfigStatus>> {
    const entries = await Promise.all(
      this.getPeersOrThrow(peersToQuery).map(async ([id, peer]) => {
        return [
          id,
          {
            status: await peer.getPeerStatus(),
            config: peer.getConfig(),
          } as PeerConfigStatus,
        ] as [string, PeerConfigStatus]
      }),
    )
    return new Map<string, PeerConfigStatus>(entries)
  }

  async searchEntries(
    user: UserInterface,
    opts: EntrySearchOptionsParams,
  ): Promise<Array<EntrySearchResultWithErrors>> {
    if (!opts.peers) {
      return []
    }
    const results = await Promise.all(
      this.getPeersOrThrow(opts.peers).map(([_, peer]) => peer.searchEntries(user, opts)),
    )
    return results.flat()
  }

  async getEntry(
    user: UserInterface,
    peerId: string,
    id: string,
    kind?: EntryKindKeys,
  ): Promise<ExternalModelInterface> {
    return this.getPeerOrThrow(peerId).getEntry(user, id, kind)
  }
}
