<div align="center">
  <table>
    <tr>
      <td width="145" align="center">
        <img src="apps/web/public/assets/sketchforge/sketchforge-logo-transparent.png" width="120" alt="SketchForge logo">
      </td>
      <td>
        <h1 align="right">SketchForge</h1>
        <h3 align="right">A local-first 3D design editor that runs in your browser.</h3>
        <p align="right">
          Build shapes, cut holes, group parts, import STL files, and export models without accounts, cloud lock-in, or heavyweight CAD setup.
        </p>
      </td>
    </tr>
  </table>

  <p>
    <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-16a34a"></a>
    <a href="https://github.com/Formsmith746/SketchForge-3D/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/Formsmith746/SketchForge-3D?style=social"></a>
    <img alt="Local first" src="https://img.shields.io/badge/local--first-no%20account-0ea5e9">
    <img alt="Version 0.2.0" src="https://img.shields.io/badge/version-0.2.0-2563eb">
  </p>
</div>

![SketchForge v0.2 editor showing a selected box on the workplane](docs/media/sketchforge-editor-v0.2.png)

## Why SketchForge

SketchForge is a lightweight CAD-style workspace for people who want to sketch, cut, and export 3D models quickly.

It is built for the satisfying loop: drop a shape, resize it, rotate it, make another shape a hole, group the result, import an STL if primitives are not enough, and export the finished model.

No login. No server project storage. No heavyweight CAD install just to make a useful part.

## What It Does

- **Local-first projects** - designs live in browser storage with generated project thumbnails.
- **Real 3D workplane** - grid, camera controls, snap settings, transform handles, outlines, and inspector controls.
- **Primitive shape library** - boxes, cylinders, spheres, cones, pyramids, wedges, text, roofs, half spheres, torus shapes, tubes, and more.
- **Solid and hole workflow** - turn shapes into cutters and group them into final geometry.
- **Boolean Intersection** - keep only the geometry where selected solid and hole shapes overlap.
- **STL import** - bring outside models into the same workspace as primitives.
- **STL and OBJ export** - export selected objects or the whole scene.
- **Fast browser stack** - Next.js, React, TypeScript, Three.js, and Manifold/CSG geometry tooling.

## Demo

![SketchForge editor demo preview](docs/media/videos/01-create-and-edit-block-preview.gif)

## Getting Started

There are three common ways to run SketchForge. If you are not sure which one to choose, use Docker.

| Path | Best for | Difficulty |
| --- | --- | --- |
| Docker / FabLab server | Teachers, classrooms, shared computers, local network hosting | Recommended |
| Local development | Developers who want to edit the code | Medium |
| Manual static hosting | Server admins who cannot use Docker | Advanced |

SketchForge is local-first in all three modes. The app files may be served from a computer or server, but projects stay in each user's browser storage. STL and OBJ exports download through the user's browser. SketchForge does not upload models to a SketchForge cloud service.

### Download the Project

If you already know Git:

```bash
git clone https://github.com/Formsmith746/SketchForge-3D.git
cd SketchForge-3D
```

If you do not know Git yet:

1. Open the GitHub page for this repository.
2. Press the green **Code** button.
3. Press **Download ZIP**.
4. Extract the ZIP somewhere easy to find, such as your Desktop.
5. Open a terminal in the extracted folder.

On Windows, you can open PowerShell in the folder by opening the folder, clicking the address bar, typing `powershell`, and pressing Enter.

## Docker / FabLab Server (Recommended)

Docker is the easiest way to run SketchForge for a classroom, workshop, or FabLab. It packages the build tools, static website, Nginx server, health check, and restart behavior together.

### What You Need

- Docker Desktop on Windows or macOS, or Docker Engine on Linux
- Docker Compose, which is included with modern Docker Desktop
- This repository downloaded on the server computer

If `docker` is not recognized, install Docker Desktop and open it once before running the commands.

### Start SketchForge

#### Compose (Build images locally)

From the SketchForge project folder, run:

```bash
docker compose -f deploy/docker/compose.yaml up --build -d
```

The first start can take a few minutes because Docker builds the app.

#### Compose (Prebuilt)

From the SketchForge project folder or with the downloaded `deploy/docker/compose-ghcr.yaml`, run:

```bash
docker compose -f deploy/docker/compose-ghcr.yaml up -d
```

#### Standalone (Prebuilt)

```bash
docker run -d --name sketchforge --restart unless-stopped -p 3000:80 ghcr.io/formsmith746/sketchforge-3d:latest
```

After running, open this on the same computer:

```text
http://127.0.0.1:3000/
```

If that works, SketchForge is running.

### Let Other Computers Join

Other computers on the same Wi-Fi or LAN need the server computer's local IP address.

On Windows PowerShell, run:

```powershell
ipconfig
```

Look for the `IPv4 Address`, for example:

```text
192.168.1.25
```

Then other computers can open:

```text
http://192.168.1.25:3000/
```

Use your own IP address, not the example one.

### Use a Different Port

If port `3000` is already being used, choose another port such as `8080`.

Windows PowerShell:

```powershell
$env:SKETCHFORGE_PORT = "8080"
docker compose -f deploy/docker/compose.yaml up --build -d
```

Linux or macOS:

```bash
SKETCHFORGE_PORT=8080 docker compose -f deploy/docker/compose.yaml up --build -d
```

Then open:

```text
http://127.0.0.1:8080/
```

### Stop SketchForge

```bash
docker compose -f deploy/docker/compose.yaml down
```

### Update SketchForge Later

If you used Git:

```bash
git pull
docker compose -f deploy/docker/compose.yaml up --build -d
```

If you downloaded the ZIP, download the newest ZIP, extract it, and run:

```bash
docker compose -f deploy/docker/compose.yaml up --build -d
```

### Docker Troubleshooting

- **`docker` is not recognized**: install Docker Desktop, open it, and try again.
- **Docker says the daemon is not running**: Docker Desktop is closed or still starting.
- **Port already in use**: use another port, for example `8080`.
- **Other computers cannot connect**: check that they are on the same network and that the server firewall allows the chosen port.
- **The page opens but old files appear**: stop and rebuild with `docker compose -f deploy/docker/compose.yaml down`, then `docker compose -f deploy/docker/compose.yaml up --build -d`.

If you already have Node.js installed, the repository also includes shortcuts:

```bash
npm run docker:up
npm run docker:down
```

## Local Development

Use this path if you want to edit SketchForge's code.

### What You Need

- Node.js 20 or newer
- npm, included with Node.js

Check your versions:

```bash
node -v
npm -v
```

If those commands do not work, install Node.js from the official Node.js website and reopen your terminal.

### Install and Run

From the SketchForge project folder:

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:3000/
```

Leave the terminal open while you use the app. To stop the development server, press `Ctrl+C` in the terminal.

### Useful Developer Commands

Run TypeScript checks:

```bash
npm run typecheck
```

Run tests:

```bash
npm run test
```

Create a production build:

```bash
npm run build
```

Build a static export:

```bash
npm run export
```

## Manual Static Deployment (Advanced)

Use this only if Docker is not allowed on your server. This path is harder because you must install and maintain Node.js, npm, a static web server, firewall rules, startup behavior, and future updates yourself.

### What You Need

- Node.js 20 or newer
- npm
- Nginx, Apache, Caddy, or another static web server
- permission to open a network port on the server firewall

### Build the Static Files

Linux or macOS:

```bash
npm ci
STATIC_EXPORT=true npm run build
```

Windows PowerShell:

```powershell
npm ci
$env:STATIC_EXPORT = "true"
npm run build
Remove-Item Env:STATIC_EXPORT
```

The deployable files are created in:

```text
apps/web/out
```

Configure your web server to serve `apps/web/out`.

For single-page app routing, unknown paths should fall back to:

```text
index.html
```

The Docker Nginx config is a good reference:

[`deploy/docker/nginx.conf`](deploy/docker/nginx.conf)

For each update, pull or download the new source, install dependencies, rebuild `apps/web/out`, replace the served files, and reload the web server.

## Project Layout

```text
apps/web/                   Next.js app workspace
apps/web/src/app/           App routes, dashboard, API routes, styles
apps/web/src/components/    Editor, viewport, sidebar, icons, controls
apps/web/src/types/         Shared shape and editor types
apps/web/src/generated/     Generated Manifold runtime source
apps/web/src/lib/           Shared utilities
apps/web/public/assets/     Static app images, icons, logos, shape assets
docs/media/                 README screenshots and demo videos
deploy/docker/              Docker, Compose, and Nginx deployment files
.github/                    Issue templates and community files
```

## Current Status

SketchForge is alpha, but the core editor loop is usable today:

- create and reopen local projects
- add, move, resize, rotate, mirror, align, duplicate, hide, and delete shapes
- switch shapes between solid and hole modes
- group and ungroup geometry
- import STL files
- export STL or OBJ
- generate project thumbnails

The next big areas are workflow polish, more geometry edge-case testing, stronger automated editor coverage, and better release documentation.

## Contributing

Contributions are welcome. Good places to help:

- editor bug fixes
- geometry and boolean test cases
- STL import/export edge cases
- UI polish
- documentation screenshots and videos
- accessibility and performance improvements

Read [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) before opening a pull request.

## Security

Please do not open public issues for security-sensitive reports. Read [.github/SECURITY.md](.github/SECURITY.md) for the reporting process.

## License

MIT. See [LICENSE](LICENSE).
