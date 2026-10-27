# 🛰️ OrbitalTrack — Space Station Tracker 3D/2D & Radio PWA

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-R3F-black?logo=three.js&logoColor=white)
![Vite PWA](https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8?logo=pwa&logoColor=white)
![SGP4](https://img.shields.io/badge/Orbit%20Engine-SGP4%20%2F%20satellite.js-06B6D4)

**OrbitalTrack** is a high-precision, interactive Progressive Web App (PWA) for real-time **3D and 2D** tracking of the **International Space Station (ISS — Zarya)** and the **Chinese Tiangong Space Station (CSS)**.

It includes a complete **SGP4** orbital propagation engine, pass prediction calculations (optical naked-eye sightings and amateur radio passes), **real-time Doppler shift correction** for ham radio operators (ARISS), and a system of **Push Notifications & Proximity Alerts**. It supports a full bilingual interface in **English** and **Italian**.

---

## ✨ Key Features

### 🌍 Interactive 3D Globe & 2D Sinusoidal Day/Night Map
- **WebGL 3D Globe (`@react-three/fiber` & `@react-three/drei`)**:
  - High-resolution Earth textures with realistic solar illumination based on UTC subsolar point.
  - Dedicated 3D models for **ISS** and **Tiangong**, ground visibility footprint ring, past orbital ground track (`-45 min`), and future track (`+95 min`).
  - 3D observer position marker and camera modes: **Free Orbit** or **Follow Station**.
- **2D Sinusoidal Day/Night World Map**:
  - Astronomically calculated real-time solar day/night terminator, Sun position, coordinate grid, visibility cone, and full sinusoidal trajectory.

### 🌐 Complete Bilingual Support (English & Italian)
- Seamless language switcher in the top navigation header (`EN` / `IT`) with automatic browser language detection and `localStorage` persistence.
- Contextual, complete translations for the entire UI, telemetry metrics, radio frequencies, listening guides, modals, and native system push notifications.

### 🔔 Push Notifications & Proximity Alerts
- **Live Proximity & Visibility Alerts**: Receive browser/OS push notifications and interactive in-app toast alerts (with Web Audio API synthesized telemetry chimes) whenever a station enters your visibility footprint ($\le 1,000\text{–}2,500\text{ km}$) or exceeds your configured minimum elevation ($\ge 5^\circ\text{–}45^\circ$).
- **Optical Visibility vs. Radio Filter**: Choose whether to receive alerts for **all passes** (including daytime/eclipse passes for radio monitoring) or **only for naked-eye visible passes** (satellite sunlit + dark/twilight sky over observer with Sun $\le -4^\circ$).
- **AOS Advance Warning & Single Pass Reminders**: Set automatic advance notifications ($5$, $10$, or $15\text{ minutes}$ before rise) or click the 🔔 icon on any pass in the schedule.

### 🔭 Pass Predictions & Global City Search
- Instantaneous SGP4 computation of upcoming passes for up to **5 days** (120 hours).
- Detailed breakdown for each window: time and azimuth for **Rise (AOS)**, **Peak (Max Elevation)**, and **Set (LOS)**, pass duration, and sky lighting condition (*Naked Eye*, *Daylight*, *Eclipse*).
- Location selection via **device GPS**, **worldwide city search with live autocompletion** (Open-Meteo Geocoding API), quick presets, or manual coordinate input with automatic **Maidenhead QTH locator** calculation (e.g. `JN61`).

### 📻 Amateur Radio Panel & Live Doppler Shift Calculation
- Built-in frequency database for **ISS (ARISS)** and **Tiangong**: Voice Repeater FM, SSTV, APRS Packet ($145.825\text{ MHz}$), Crew Downlink, and telemetry.
- Live **Doppler shift** calculation ($\Delta f$ in $\text{Hz}$ and adjusted frequency in $\text{MHz}$ for Downlink RX and Uplink TX) based on instantaneous radial velocity (`rangeRateKms`) between station and observer, including CTCSS/PL tones.

### 📱 Progressive Web App (PWA) & Offline Resilience
- Installable on Desktop, Android, and iOS as a standalone app.
- Automatic orbital parameter **TLE (Two-Line Element)** updates from **CelesTrak**, with intelligent `localStorage` caching and Workbox Service Worker for offline operation.

---

## 🛠️ Technology Stack

- **Frontend Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool & PWA**: [Vite 5](https://vitejs.dev/) + [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (Workbox)
- **3D Engine**: [Three.js](https://threejs.org/), [`@react-three/fiber`](https://docs.pmnd.rs/react-three-fiber), [`@react-three/drei`](https://github.com/pmndrs/drei)
- **Orbital Mechanics**: [`satellite.js`](https://github.com/shashwatak/satellite-js) (SGP4/SDP4 Propagator)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Lucide React Icons](https://lucide.dev/)

---

## 🚀 Installation and Local Development

### Prerequisites
- **Node.js** `>= 18.x`
- **npm** `>= 9.x`

### 1. Clone the repository and install dependencies
```bash
git clone https://github.com/your-username/space-tracker.git
cd space-tracker
npm install
```

### 2. Start the development server
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173/`.

To expose the server across your local network (ideal for testing on smartphones/tablets):
```bash
npm run dev -- --host
```

### 3. Production build and PWA preview
```bash
npm run build
npm run preview
```

---

## 📂 Project Structure

```text
space-tracker/
├── public/
│   ├── favicon.svg
│   └── icons/                  # PWA icons (192x192, 512x512)
├── src/
│   ├── components/
│   │   ├── Header.tsx          # Top bar, station selector, QTH locator, language switch, notifications
│   │   ├── ViewportSwitcher.tsx# Interactive switch between 3D Globe <-> 2D Map
│   │   ├── SightingsModal.tsx  # City search, GPS, manual coordinates, and 5-day pass calendar
│   │   ├── NotificationModal.tsx # Push notification settings, proximity filters, and test triggers
│   │   ├── globe3d/            # 3D Earth globe, ISS/Tiangong models, solar lighting
│   │   ├── map2d/              # 2D sinusoidal map with day/night terminator
│   │   └── dashboard/          # Telemetry Grid, Next Passes (24h), Doppler Radio Panel
│   ├── data/
│   │   ├── defaultTles.ts      # Fallback TLEs & station metadata (NORAD 25544 & 48274)
│   │   ├── radioFrequencies.ts # ARISS / CSS radio frequencies & bilingual listening tips
│   │   └── worldLandPolygons.ts# Continent vector polygons for fast rendering
│   ├── hooks/
│   │   ├── useSpaceStations.ts # 1Hz real-time telemetry loop & pass prediction
│   │   ├── useUserLocation.ts  # Device GPS & location persistence
│   │   └── usePassNotifications.ts # Push notifications engine, proximity checks & audio alerts
│   ├── i18n/
│   │   ├── LanguageContext.tsx # React Provider for language selection & persistence (EN/IT)
│   │   ├── translations.ts     # Complete English and Italian translation dictionaries
│   │   └── types.ts            # TypeScript definitions for the translation schema
│   ├── services/
│   │   ├── orbitalEngine.ts    # SGP4 propagation, solar calculations, Doppler, Maidenhead QTH
│   │   └── tleService.ts       # CelesTrak / WhereTheISS TLE fetching & caching
│   └── types/
│       └── station.ts          # TypeScript interfaces for telemetry, passes, and notifications
├── vite.config.ts              # Vite configuration & PWA Service Worker
└── package.json
```

---

## 📡 Notes on Browser Push Notifications
- Native operating system notifications use the **Web Notification API** and the **PWA Service Worker** (which requires a secure context such as `http://localhost` or `HTTPS`).
- Additionally, the app includes a **high-visibility in-app toast banner** with a **synthesized audio chime (Web Audio API)** that functions reliably regardless of whether system notification permissions are granted.

---

## 📜 License

Distributed under the **MIT** License. Orbital data provided by [CelesTrak](https://celestrak.org/) and radio frequencies from [ARISS](https://www.ariss.org/). *73 de OrbitalTrack!*
