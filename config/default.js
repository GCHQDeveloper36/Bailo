module.exports = {
  mongo: {
    uri: 'mongodb://localhost:27017/bailo',
    connectionOptions: {
      useFindAndModify: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    },
  },

  minio: {
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
    region: '',

    uploadBucket: 'uploads',
    registryBucket: 'registry',
    createBuckets: true,
  },

  registry: {
    host: 'localhost:8080',
    port: 8080,

    service: 'RegistryAuth',
    issuer: 'RegistryIssuer',

    insecure: true,
  },

  s2i: {
    path: '/s2i/s2i',
    builderImage: 'seldonio/seldon-core-s2i-python37:1.10.0',
  },

  build: {
    environment: 'openshift',
  },

  openshift: {
    namespace: 'bailo',
    appPublicRoute: 'https://appPublicRoute',
    dockerPushSecretName: 'registry-push-secret',
  },

  uiConfig: {
    banner: {
      enable: true,
      text: 'DEPLOYMENT: INSECURE',
      colour: 'orange',
    },
    issues: {
      label: 'Bailo Support Team',
      supportHref: 'mailto:hello@example.com?subject=Bailo%20Support',
      contactHref: 'mailto:hello@example.com?subject=Bailo%20Contact',
    },
    help: {
      documentationUrl: 'https://example.com',
    },
    registry: {
      host: 'localhost:8080',
    },
    uploadWarning: {
      showWarning: true,
      checkboxText: 'By checking here you confirm that the information is correct',
    },
    deploymentWarning: {
      showWarning: true,
      checkboxText: 'By checking here you confirm that the information is correct',
    },
  },

  smtp: {
    enabled: true,
    host: 'mail',
    port: 1025,
    secure: false,
    auth: {
      user: 'mailuser',
      pass: 'mailpass',
    },
    tls: {
      rejectUnauthorized: false,
    },
    from: '"Bailo 📝" <bailo@example.org>',
  },

  logging: {
    file: {
      enabled: false,
      level: 'info',
      path: './logs/out.log',
    },
  },

  app: {
    protocol: 'http',
    host: 'localhost',
    port: 8080,
  },

  listen: 3000,
}
