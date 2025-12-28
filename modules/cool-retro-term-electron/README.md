# cool-retro-term-electron

An Electron-based CRT terminal application using [cool-retro-term-renderer](../cool-retro-term-renderer). This package provides a native desktop terminal with authentic CRT visual effects.

## Features

- **Real Terminal**: Uses `node-pty` to spawn a real shell process
- **CRT Effects**: Full WebGL-based CRT visual effects from cool-retro-term-renderer
- **Cross-Platform**: Works on macOS, Linux, and Windows
- **XTerm.js Integration**: Uses XTerm.js for terminal emulation

## Installation

```bash
npm install
```

Note: `node-pty` requires native compilation. Make sure you have the necessary build tools:

- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: `build-essential` package
- **Windows**: Visual Studio Build Tools

## Development

### Build

```bash
npm run build
```

### Run

```bash
npm start
```

### Watch Mode (Development)

```bash
npm run dev
# In another terminal:
npm start
```

## Architecture

The application follows Electron's multi-process architecture:

```
┌─────────────────────────────────────────────────────┐
│                   Main Process                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │              main.ts                            │ │
│  │  - Creates BrowserWindow                        │ │
│  │  - Manages node-pty process                     │ │
│  │  - Handles IPC communication                    │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                    IPC Bridge
                         │
┌─────────────────────────────────────────────────────┐
│                 Preload Script                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │              preload.ts                         │ │
│  │  - Exposes terminalAPI via contextBridge       │ │
│  │  - Secure IPC communication                     │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                  Window API
                         │
┌─────────────────────────────────────────────────────┐
│                Renderer Process                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │              renderer.ts                        │ │
│  │  - Creates XTerm.js instance                    │ │
│  │  - Creates CRTTerminal renderer                 │ │
│  │  - Connects keyboard input to PTY               │ │
│  │  - Displays PTY output with CRT effects         │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Data Flow

1. **Keyboard Input**: User types → XTerm.js captures → IPC to main process → node-pty writes to shell
2. **Shell Output**: Shell outputs → node-pty reads → IPC to renderer → XTerm.js buffer → CRT renderer displays

## Configuration

You can customize the CRT effects by modifying the settings in `renderer.ts`:

```typescript
const crtTerminal = new CRTTerminal({
    container: element,
    fontColor: "#0ccc68",      // Terminal text color
    backgroundColor: "#000000", // Background color
    screenCurvature: 0.3,      // Screen curve amount (0-1)
    bloom: 0.5538,             // Glow effect (0-1)
    brightness: 0.5,           // Brightness (0-1)
    flickering: 0.1,           // Screen flicker (0-1)
    horizontalSync: 0.08,      // H-sync distortion (0-1)
    jitter: 0.1997,            // Pixel jitter (0-1)
    staticNoise: 0.1198,       // Static noise (0-1)
    glowingLine: 0.2,          // Scanning line (0-1)
    burnIn: 0.2517,            // Phosphor persistence (0-1)
    rasterizationMode: 1,      // 0=none, 1=scanline, 2=pixel, 3=subpixel
    rasterizationIntensity: 0.5,
});
```

## License

GPL-3.0
