### Helm Chart Instructions

Helm allows us to manage Kubernetes applications. We define a 'Helm chart' and then 'Helm' manages creating, updating
and destroying resources on a target Kubernetes cluster. To install Bailo using these guides you need the following
prerequisites:

- Helm (https://helm.sh/).
- Kubectl (https://kubernetes.io/docs/tasks/tools/).
- An existing Kubernetes cluster, AWS EKS for example.
- Kubectl pointing to EKS cluster (check with `kubectl cluster-info`).

All commands assume they are run in the `helm/bailo` directory with the right context. Context can be set with:

1. `kubectl config set-context --current --namespace=bailo`

All commands also assume that the namespace is already created, a namespace can be created with:

1. `kubectl create namespace bailo`

#### Configuration

Deployment options can be overridden by including a `--values <file containing overrides>` to a Helm command, or by
using `--set <option>=<value>`.

We do not host built images of Bailo, thus at the very minimum the configuration should include the location of a Bailo
image:

```yaml
---
image:
  repository: some.repository.com
  tag: 'latest'
```

Images can be built with `frontend$ docker build -t "frontend:<tag>" -f ./Dockerfile .`, `backend$ docker build -t "backend:<tag>" -f ./Dockerfile .`
and `lib/modelscan$ docker build -t "modelscan:<tag>" -f ./Dockerfile .` in their respective directory. This guide assumes the overrides file is
called `local.yaml` in the `helm/bailo` folder.

#### Generate certs

Basic certs should be placed in `backend/certs`

1. `openssl genrsa -out key.pem 2048 && openssl req -new -x509 -key key.pem -out cert.pem -config san.cnf -extensions 'v3_req' -days 360`
2. Registry requires a JWKS file for the token authentication with the backend application. For development, a JWKS file is generated by running `npm run certs`. For production, the script `generateJWKS.ts` can be used to generate a JWKS file for the public key referenced in the backend application configuration.

#### Minimal local.yaml for OpenShift (Clamav and ModelScan are optional)

```yaml
image:
  frontendRepository: 'image-registry-openshift-imagestreams'
  frontendTag: tag
  backendRepository: 'image-registry-openshift-imagestreams'
  backendTag: tag
  modelscanRepository: 'image-registry-openshift-imagestreams'
  modelscanTag: tag

route:
  enabled: true
  appPublicRoute: openshift-route-url

mongodb:
  auth:
    passwords:
      - mongodb-password
    usernames:
      - mongodb-user

clamav:
  enabled: true

modelscan:
  enabled: true

connectors:
  fileScanners:
    kinds: ['clamAV', 'modelScan']

openshift:
  namespace: project-name
```

#### EKS Build

1. https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html
2. vim eks/cluster.yaml. Update name and region. Add or amend other parameters as necessary.
3. `eksctl create cluster -f infrastructure/eks/cluster.yaml`
4. https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html

#### Minimal local.yaml for AWS EKS (Clamav and ModelScan are optional)

```yaml
image:
  frontendRepository: 'aws-elastic-container-registry'
  frontendTag: tag
  backendRepository: 'aws-elastic-container-registry'
  backendTag: tag
  modelscanRepository: 'aws-elastic-container-registry'
  modelscanTag: tag

ingress:
  enabled: true
  name: 'bailo-ingress'
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: instance
  fqdn: '*.amazonaws.com' #your url
  path: "/"
  pathType: "Prefix"
  service:
    name: "node-port"
    port: 8080

aws:
  enabled: true

mongodb:
  persistence:
    enabled: false
    existingClaim: bailo-mongodb
  auth:
    passwords:
      - mongodb-password
    usernames:
      - mongodb-user

minio:
  persistence:
    enabled: false
    existingClaim: bailo-minio

securityContext:
  runAsUser: 1001

clamav:
  enabled: true

modelscan:
  enabled: true

connectors:
  fileScanners:
    kinds: ['clamAV', 'modelScan']

```

#### Cognito client configuration example (optional)

```yaml
connectors:
  authentication:
    kind: 'oauth'

cookie:
  secret: 'random secret'

oauth:
  enabled: true
  origin: 'https://your-hosted-url'
  cognito:
    key: cognito key
    secret: cognito secret
    dynamic: "['scope']"
    response: "['tokens', 'raw', 'jwt']"
    callback: '/'
    subdomain: 'cognito domain'
    adminGroupName: 'cognito admin group if you have set one'
  identityProviderClient:
    userPoolId: "user pool"
    userIdAttribute: "email"
```

#### Install Bailo

1. `helm dependency update`
2. `helm install --values ./local.yaml bailo .`
3. `helm list # list current deployments`

#### Upgrade Bailo

1. `helm upgrade --values ./local.yaml bailo .`

#### Test Bailo infrastructure

1. `helm test bailo`

#### Removing Bailo

1. `helm uninstall bailo`

### Parameters - supplements values.yaml

#### Image parameters
| Name  | Description  | Value |
| ----  | ----------  | ----- |
| `image.frontendRepository`  | Frontend image location | `null`  |
| `image.frontendTag`  | Frontend image tag | `null`  |
| `image.backendRepository`  | Backend image location | `null`  |
| `image.backendTag`  | Backend image tag | `null`  |
| `image.modelscanRepository`  | Modelscan image location | `null`  |
| `image.modelscanTag`  | Modelscan image tag | `null`  |
| `image.pullPolicy`  | https://kubernetes.io/docs/concepts/containers/images/#image-pull-policy  | `IfNotPresent` |

#### Pod parameters
| Name  | Description  | Value |
| ----  | ----------  | ----- |
| `imagePullSecrets`  | https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#containers | `null` |
| `podAnnotations`  | https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/#attaching-metadata-to-objects  | `{}` |
| `replicaCount`  | Ignored if autoscaling is enabled | `1` |
| `autoscaling.enabled`  | https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/ | `false` |
| `autoscaling.minReplicas`  | HPA configuration | `1` |
| `autoscaling.maxReplicas`  | HPA configuration | `10` |
| `autoscaling.targetCPUUtilizationPercentage`  | HPA configuration | `80` |
| `autoscaling.targetMemoryUtilizationPercentage`  | HPA configuration | `80` |
| `podSecurityContext`  | https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#security-context | `{}` |
| `securityContext.readOnlyRootFilesystem`  | https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#security-context | `false` |
| `securityContext.runAsNonRoot`  | Does not run as UID 0 (root) https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#security-context | `true` |
| `resources.limits.cpu`  | Default pod cpu limits https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#alpha-level| `400m` |
| `resources.limits.memory`  | Default pod memory limits | `512Mi` |
| `resources.requests.cpu`  | Default pod cpu requests | `200m` |
| `resources.requests.memory`  | Default pod memory requests | `256Mi` |
| `resourcesFrontend.limits.cpu`  | Default frontend pod cpu limits | `400m` |
| `resourcesFrontend.limits.memory`  | Default frontend pod memory limits | `800Mi` |
| `resourcesFrontend.requests.cpu`  | Default frontend pod cpu requests | `400m` |
| `resourcesFrontend.requests.memory`  | Default frontend pod memory requests | `800Mi` |
| `resourcesBackend.limits.cpu`  | Default backend pod cpu limits | `800m` |
| `resourcesBackend.limits.memory`  | Default backend pod memory limits | `2Gi` |
| `resourcesBackend.requests.cpu`  | Default backend pod cpu requests | `400m` |
| `resourcesBackend.requests.memory`  | Default backend pod memory requests | `1Gi` |
| `nodeSelector`  | Pod placement https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#scheduling | `{}` |
| `tolerations`  | Pod placement | `[]` |
| `affinity`  | Pod placement | `{}` |

#### Service Account parameters
| Name  | Description  | Value |
| ----  | ----------  | ----- |
| `backend.serviceAccount`  | If set, service account can be used to connect Backend to S3 without using aws access and secret keys | `null` |
| `registry.serviceAccount` | If set, service account can be used to connect Registry to S3 without using aws access and secret keys | `null` |

#### Network parameters
| Name  | Description  | Value |
| ----  | ----------  | ----- |
| `service.type`  | Exposes the Service on a cluster-internal IP https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types  | `ClusterIP` |
| `service.frontendPort`  | Frontend port for Service to connect to | `3000` |
| `service.backendPort`  | Frontend port for Service to connect to | `3001` |
| `ingress.enabled `  |  Map traffic to different backends based on rules you define via the Kubernetes API https://kubernetes.io/docs/concepts/services-networking/ingress/ | `false`  |
| `route.enabled`  | OpenShift configuration used in lieu of Ingress  | `false` |
| `route.appPublicRoute`  | Public url for Bailo whilst using OpenShift | `false` |

#### AWS specific configurations
| Name  | Description  | Value |
| ----  | ----------  | ----- |
| `aws.enabled` | This is only a guide and depends on EKS setup. Enables Service NodePort, StorageClass and PersistentVolumeClaim for MinoIO and MongoDB.  See nodeport.yaml and storage.yaml | `false` |

#### OAuth configurations
| Name  | Description  | Value |
| ----  | ----------  | ----- |
| `cookie.secret`  | A randomly generated secret key used to encrypt and sign session cookies, ensuring data security and integrity   | `somerandomstring12341234567890AB` |
| `oauth.enabled`  | Currently setup to use Cognito https://aws.amazon.com/blogs/security/how-to-use-oauth-2-0-in-amazon-cognito-learn-about-the-different-oauth-2-0-grants/   | `false` |

#### Bailo supporting service configurations
| Name  | Description  | Value |
| ----  | ----------  | ----- |
| `nginxAuth.repository`  | Runs Nginx as non-root unprivileged user  | `nginxinc/nginx-unprivileged` |
| `mongodb.enabled`  | Using bitnami chart 15.1.4. https://artifacthub.io/packages/helm/bitnami/mongodb/15.1.4. Also refer to Mongo host defination and Create the mongo connection URI in template/_helper.tpl  | `true` |
| `minio.enabled`  | Using bitnami chart 14.2.0. https://artifacthub.io/packages/helm/bitnami/minio/14.2.0  | `true` |
| `mail.enabled`  | Using image marlonb/mailcrab:latest  | `true` |
| `registry.enabled`  | Using image registry:3.0.0. Must use regitsry:3.0.0 if registry.serviceAccount is defined  | `true` |
| `clamav.enabled`  | Optional. Using image clamav/clamav:1.4.2_base   | `false` |
| `modelscan.enabled`  | Optional. Image defined in image.modelscanRepository  | `false` |

#### Bailo instance settings
| Name  | Description  | Value |
| ----  | ----------  | ----- |
| `config.ui.banner.enabled`  | Enables banner at top of the page  | `false`  |
| `config.ui.banner.text`  | Content of top banner | `BAILO`  |
| `config.ui.banner.colour`  | Colour of top banner  | `#047a06`  |
| `config.ui.banner.textColor`  | Colour of top banner text  | `black`  |
| `config.announcement.enabled`  | Enables announcement banner at bottom of the page  | `false`  |
| `config.announcement.text`  | Content of announcement banner  | `null`  |
| `config.announcement.startTimestamp`  | Start time of announcement banner  | `null`  |
| `config.helpPopoverText.manualEntryAccess`  | Help text for manually adding a user to a model  | `null`  |
| `config.modelDetails.organisations`  | Organisation options for models  | `[]`  |
| `config.modelDetails.states`  | States options for models  | `[]`  |
| `config.smtp.port`  | Backend connection port to mail server https://nodemailer.com/smtp  | `1025`  |
| `config.smtp.secure`  | Enable to use TLS   | `false`  |
| `config.smtp.rejectUnauthorized`  | TLS option | `false`  |
| `config.smtp.user`  | Auth username  | `mailuser`  |
| `config.smtp.pass`  | Auth password  | `mailpass`  |
| `config.smtp.from`  | Email address used by Bailo. When a review is required, for example  | `bailo@example.com`  |
| `config.app.protocol`  | Used for external bailo url. See backed/src/services/smtp   | `https`  |
| `config.app.port`  | Used for external bailo url  | `443`  |
| `config.issueLinks.support`  | Help page email configuration  | `mailto:?subject=Bailo%20Contact`  |
| `config.issueLinks.contact`  | Help page email configuration | `mailto:?subject=Bailo%20Contact`  |
| `connectors.authentication.kind`  | Name of the connector to be used for authentication  | `silly`  |
| `registry.certFile`  | Ensure it matches cert name used in backend.deployment.yaml and registry.deployment.yaml  | `cert.pem`  |
| `registry.keyFile`  | Ensure it matches key name in backend.deployment.yaml and registry.deployment.yaml  | `key.pem`  |
| `registry.jwksFile`  | See generate certs section above  | `jwks.json`  |
| `connectors.authentication.kind`  | Name of the connector to be used for authentication  | `silly`  |
| `connectors.authorisation.kind`  | Name of the connector to be used for authorisation  | `basic`  |
| `connectors.audit.kind`  | Name of the connector to be used for auditing  | `silly`  |
| `connectors.fileScanners.kinds` | A list of the file scanner names to enable. See local.yaml example above  | `[]`  |
| `connectors.fileScanners.retryDelayInMinutes` | Number of minutes between scans on a given file   | `60`  |
| `connectors.fileScanners.maxInitRetries` | Number of times the microservice is attempted to be reached before failing at startup  | `5`    |
| `connectors.fileScanners.initRetryDelay` | Delay between successive microservice pings in milliseconds    | `5000` |
| `instrumentation.enabled`  | Enable OpenTelemetry instrumentation | `false`  |
| `instrumentation.debug`  | Enable instrumentation debugging  | `false`  |
| `modelMirror.import.enabled`  | Enable creation of mirrored models  | `false`  |
| `modelMirror.export.enabled`  | Enable the exporting of models to S3  | `false`  |
| `modelMirror.export.disclaimer`  | Disclaimer shown to the user in the UI prior to exporting a model |## Example Agreement \n I agree that this model is suitable for exporting  | ``  |
| `modelMirror.export.kmsSignature.enabled`  | Enable the use of KMS signatures when exporting a model  | `false`  |
| `modelMirror.export.kmsSignature.keyId`  | KMS key to use when signing an export  | `123`  |
| `modelMirror.export.kmsSignature.KMSClient.region`  | AWS region for the KMS client  | `eu-west-1`  |
| `modelMirror.export.kmsSignature.KMSClient.`  | Access key credential for the KMS client  | `accessKey`  |
| `modelMirror.export.kmsSignature.KMSClient.`  | Secret key credential for the KMS client  | `secretKey`  |

#### Inferencing cluster reference configurations
| Name  | Description  | Value |
| ----  | ----------  | ----- |
| `inference.enabled`  | Enable inferencing  | `false`  |
| `inference.host`  | URL of inferencing cluster  | `https://example.com`  |
| `inference.gpus`  | Available GPUs a user can select  | null  |
| `inference.authorizationTokenName`  | Name of authorisation token  | `inferencing-token`  |
| `inference.authorisationToken`  | Authorisation token used to connect to inferencing service  | null  |
