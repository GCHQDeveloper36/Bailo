[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]

> Bailo is still in development and we have not yet completed all of the features we want it to have. See the roadmap for what we plan to build.

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/gchq/bailo">
    <h1>
      <!-- TODO: Fix #gh-dark-mode-only -->
      <img src="public/Bailo-logo-full-no-box.png" alt="Logo" width="170">
    </h1>
  </a>

  <p align="center">
    Making it easy to compliantly manage the machine learning lifecycle
    <br />
    <a href="https://github.com/gchq/Bailo/blob/main/docs/user-guide.md"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/gchq/bailo/issues">Report a Bug</a>
    ·
    <a href="https://github.com/gchq/bailo/issues">Request a Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<br />

<!-- ABOUT THE PROJECT -->

## About The Project

[![Product Screen Shot][product-screenshot]](https://github.com/gchq/bailo)

Bailo helps you manage the lifecycle of machine learning to support scalability, impact, collaboration, compliance and sharing.

### Built With

- [Next.js](https://nextjs.org/)
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Seldon](https://www.seldon.io/)

<br />

<!-- GETTING STARTED -->

## Getting Started

### Requirements:

- Node v16
- Docker / Docker Compose
- S2I

<br />

### Installation:

```bash
git clone https://github.com/gchq/Bailo.git && cd Bailo
npm install
npm run certs
docker-compose up -d
npm run dev
```

On first run, it may take a while (perhaps 30 seconds) to start up. It needs to build several hundred TypeScript modules. These are cached however, so future starts only require a few seconds. There's also `npm run dev2` for an alternative type checker that is more rigorous.

<br />

### Setup:

No schemas are installed by default. To add an example one, run:

```bash
ts-node --project tsconfig.server.json server/scripts/addDeploymentSchema.ts
ts-node --project tsconfig.server.json server/scripts/addUploadSchema.ts
```

> NOTE: Scripts are also written in Typescript, install ts-node with `npm install -g ts-node`.

<br />

### Service Ports:

| Service    | Host  | Notes                 |
| ---------- | ----- | --------------------- |
| NodeJS App | 3000  |                       |
| Mongo      | 27017 | No credentials        |
| Redis      | 6379  | No credentials        |
| Registry   | 5000  | HTTPS only, no UI     |
| Minio UI   | 9001  | minioadmin:minioadmin |
| Minio      | 9000  | minioadmin:minioadmin |

\*\* Note: these credentials are intentionally basic/default, but in your own instances we recommend changing them to something more secure.

<br />

### Logical Project Flow (Overview)

![bailo diagram](public/mm-diagram.png)

1. A user accesses a URL. We use [NextJS routing](https://nextjs.org/docs/routing/introduction) to point it to a file in `pages`. `[xxx].tsx` files accept any route, `xxx.tsx` files allow only that specific route.
2. Data is loaded using [SWR](https://swr.vercel.app/). Data loaders are stored in `./data`. Each one exposes variables to specify if it is loading, errored, data, etc.
3. Requests to the backend get routed through [express](https://expressjs.com/) within `server/index.ts`. Each route is an array with all items being middleware except the last, which is the handler (`[...middleware, handler]`).
4. Routes interact with the database via `mongoose`, which stores models in `./server/models`.

Some processing is done away from the main thread, when it is expected to take longer than a few milliseconds. These are posted to a `redis` queue and processed by handlers in the `server/processors` folder. Redis queues are handled invisibly by `bee-queue` (`server/utils/queues.ts`).

<br />

### Known Issues

_Issue: Sometimes Docker struggles when you add a new dependency._

Fix: Run `docker-compose down --rmi all` followed by `docker-compose up --build`.

_Issue: Sometimes SWR fails to install its own binary and the project will refuse to start up (development only)_

Fix: Run `npm uninstall next && npm install next`. Some users report still having issues. If so, run: `rm -rf node_modules && rm -rf package-lock.json && npm cache clean -f && npm i`.

<br />

### Roadmap

List of near term goals:

- Python client
- Improve test coverage of core deployment
- K8s Helm charts
- AWS deployment pattern
- Azure deployment pattern
- Deployment container watermarking

<br />

<!-- USAGE EXAMPLES -->

## Usage

See [docs/USER-GUIDE.md](docs/user-guide.md)

<br />

<!-- CONTRIBUTING -->

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md)

<br />

<!-- LICENSE -->

## License

Bailo is released under the Apache 2.0 Licence and is covered by Crown Copyright. See `LICENSE.txt` for more information.

<br />

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

- [Img Shields](https://shields.io)
- [Othneils's README Template](https://github.com/othneildrew/Best-README-Template)
- [Mattermost's Code Contribution Guidelines](https://github.com/mattermost/mattermost-server/blob/master/CONTRIBUTING.md)

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/gchq/bailo.svg?style=for-the-badge
[contributors-url]: https://github.com/gchq/bailo/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/gchq/bailo.svg?style=for-the-badge
[forks-url]: https://github.com/gchq/bailo/network/members
[stars-shield]: https://img.shields.io/github/stars/gchq/bailo.svg?style=for-the-badge
[stars-url]: https://github.com/gchq/bailo/stargazers
[issues-shield]: https://img.shields.io/github/issues/gchq/bailo.svg?style=for-the-badge
[issues-url]: https://github.com/gchq/bailo/issues
[license-shield]: https://img.shields.io/github/license/gchq/bailo.svg?style=for-the-badge
[license-url]: https://github.com/gchq/bailo/blob/master/LICENSE.txt
[product-screenshot]: docs/images/ProductScreenshot.png
