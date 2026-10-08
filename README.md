# PoliSport Tournament Management System

A full-stack Next.js tournament management platform built for organizing sports tournaments (Football & Basketball) with group stages, flexible draws, knockout brackets, live match event tracking, automated standings, and player statistics.

---

## 🚀 Getting Started

### 1. Installation
```bash
cd polisport-app
npm install
```

### 2. Database Initialization & Seeding
The application uses local SQLite storage with automated triggers and views.
To seed the clean 32-team tournament dataset (4 groups of 8 teams, 4 matches per team, initial played games):
```bash
npm run seed:32
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🔑 Administrative Access

- **Login URL**: [http://localhost:3000/auth/login](http://localhost:3000/auth/login)
- **Email**: `andrei.armean17@gmail.com`
- **Password**: `admin123`

---

## 🏆 Key Features

1. **Explicit Group Tracking (Grupa A, B, C, D)**:
   - Matches display dedicated group badges (`Grupa A`, `Grupa B`, `Grupa C`, `Grupa D`).
   - Admin Scheduler (`/admin/meciuri`): Group filter tabs to schedule matches group by group with live match count badges.
   - Admin Program (`/admin/program`): Sub-filters by group and distinct badge styling.
   - Public Schedule (`/public`): Clear visual group indicators for spectators.

2. **Flexible Tournament Draw**:
   - Supports 32 teams (8 per group, 4 matches per team), 36 teams, or any team count $\ge 8$.
   - Generates 4 balanced groups using Fisher-Yates randomization.
   - Generates non-repeating group matches where each team plays exactly 4 unique games.

3. **Automated SQLite Triggers**:
   - `trg_update_standings`: Updates points, wins, draws, losses, goals for/against, and goal difference upon match completion.
   - `trg_update_player_stats` / `trg_revert_player_stats`: Updates goals and yellow/red cards in real-time when match events are added or removed.

4. **Production Readiness for Vercel**:
   - Bundles SQLite native packages via `serverExternalPackages: ["better-sqlite3"]`.
   - Automatically clones the template database into `/tmp/polisport.db` in serverless environments to prevent read-only filesystem (`EROFS`) errors.
   - Supports both `/tmp/uploads` and local file uploads.

---

## ☁️ Deployment to Vercel

1. Push your repository to GitHub.
2. Import the project in [Vercel Dashboard](https://vercel.com/new).
3. Set **Root Directory** to `polisport-app`.
4. Configure environment variables in Vercel project settings:
   - `NEXT_PUBLIC_APP_URL`: Your Vercel domain (e.g., `https://your-app.vercel.app`)
   - `ADMIN_EMAIL`: `andrei.armean17@gmail.com`
   - `ADMIN_PASSWORD`: `admin123`
5. Deploy! Vercel will build and serve the application automatically.
