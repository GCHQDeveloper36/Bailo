import './instrumentation.js'

//import shelljs from 'shelljs'
import { ensureBucketExists } from './clients/s3.js'
import log from './services/log.js'
import config from './utils/config.js'
import { connectToMongoose } from './utils/database.js'
import { registerSigTerminate } from './utils/signals.js'

// Update certificates based on mount
//shelljs.exec('update-ca-certificates', { fatal: false, async: false })

// technically, we do need to wait for this, but it's so quick
// that nobody should notice unless they want to upload an image
// within the first few milliseconds of the _first_ time it's run
// if (config.s3.automaticallyCreateBuckets) {
//   ensureBucketExists(config.s3.buckets.uploads)
//   ensureBucketExists(config.s3.buckets.registry)
// }

// connect to Mongo
connectToMongoose()

import('./routes.js').then((r) => {
  const httpServer = r.server.listen(config.api.port, () => {
    log.info(config.api.port, 'Listening on port')
  })
  // Set header timeout to 24H
  httpServer.headersTimeout = 86400000

  registerSigTerminate(httpServer)
})
