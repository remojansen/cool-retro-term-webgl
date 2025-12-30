# cool-retro-term-webgl

A WebGL-based CRT terminal renderer that brings authentic retro CRT visual effects to modern web and desktop applications.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

![Preview](./preview.png)

## 🎮 Live Demo

**[Try the live demo →](https://remojansen.github.io/)**

## 📦 Packages

This monorepo contains two packages:

### [cool-retro-term-renderer](./modules/cool-retro-term-renderer)

[![npm version](https://img.shields.io/npm/v/cool-retro-term-renderer.svg)](https://www.npmjs.com/package/cool-retro-term-renderer)

A WebGL-based CRT terminal renderer library for XTerm.js. This package provides the core rendering engine with authentic retro CRT visual effects including:

- 📺 Screen curvature distortion
- ✨ Phosphor glow (bloom)
- 📻 Scanlines and rasterization effects
- 🔴 RGB shift (chromatic aberration)
- ⚡ Flickering and static noise
- 🔥 Burn-in (phosphor persistence)
- 🌊 Horizontal sync distortion and jitter

```bash
npm install cool-retro-term-renderer
```

Use this package to integrate CRT effects into your own web-based terminal applications.

---

### [cool-retro-term-electron](./modules/cool-retro-term-electron)

A native desktop terminal application built with Electron. This package provides a ready-to-use CRT terminal emulator that:

- 🖥️ Runs a real shell process via `node-pty`
- 🎨 Displays output with full CRT visual effects
- 💻 Works on macOS, Linux, and Windows
- ⌨️ Full keyboard and mouse support via XTerm.js

```bash
cd modules/cool-retro-term-electron
npm install
npm run build
npm start
```

Use this package for a standalone retro terminal experience on your desktop.

## 🚀 Quick Start

### Using the Renderer Library

```typescript
import { CRTTerminal } from 'cool-retro-term-renderer';
import { Terminal } from '@xterm/xterm';

const container = document.getElementById('terminal')!;
const crt = new CRTTerminal({ container });

const xterm = new Terminal({ cols: 80, rows: 24 });
crt.attachXTerm(xterm);

xterm.write('Hello, CRT World!\r\n');
```

### Running the Electron App

```bash
# Clone the repository
git clone https://github.com/remojansen/cool-retro-term-webgl.git
cd cool-retro-term-webgl

# Install dependencies
npm install

# Build and run
npm run build
npm run start:electron
```

## 🛠️ Development

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Build individual packages
npm run build:renderer
npm run build:electron

# Development mode with watch
npm run dev:renderer
npm run dev:electron

# Lint and format
npm run lint-and-format
```

## 📄 License

GPL-3.0

## 🙏 Credits

This project is a port to WebGL from [cool-retro-term](https://github.com/Swordfish90/cool-retro-term) by Filippo Scognamiglio.

This library uses the [Terminus Font](https://terminus-font.sourceforge.net/) by Dimitar Zhekov, licensed under the SIL Open Font License (OFL).
