# PresetHub – Lightroom Preset Marketplace

A full‑stack web application where users can browse, download, upload, and review Lightroom presets. Built with Node.js, Express, LowDB, and vanilla JavaScript.

## Features
- User authentication (signup/login with JWT)
- Preset CRUD with file upload (`.xmp`, `.dng`, `.lrtemplate`)
- Advanced search, filtering, sorting
- Reviews & ratings
- Wishlist (favorites)
- Creator dashboard
- Admin panel
- PWA support (offline, installable)

## Tech Stack
- Backend: Node.js + Express + LowDB
- Frontend: Vanilla JS + CSS + HTML
- PWA: Service Worker + Manifest

## Installation
1. Clone the repo.
2. `cd backend && npm install`
3. Create `uploads/` folder in backend.
4. `npm run dev`
5. Open `http://localhost:4000`

## Environment Variables (optional)
- `PORT=4000`
- `JWT_SECRET=your_secret`

## License
MIT