# SWARX MVP

Production-ready MVP for a communication and placement training platform.

## Tech Stack

- Frontend: React + Tailwind CSS + React Router
- Backend: Node.js + Express
- Database: MongoDB (Mongoose)
- Auth: JWT
- File storage: local uploads (default) or Cloudinary

## Folder Structure

```text
swarx-mvp/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      utils/
      seeds/
  frontend/
    src/
      api/
      components/
      context/
      layouts/
      pages/
      router/
```

## Core Features Included

- Role-based auth (Student / Trainer / Admin)
- Student dashboard (daily tasks, upload/record, AI feedback, progress)
- Speaking module (browser audio recording + upload)
- Dummy AI analysis module (grammar, vocabulary, confidence, score)
- Trainer dashboard (assigned students, review submissions, add feedback, assign tasks)
- Admin panel (users CRUD, trainer assignment, analytics)
- Leaderboard + daily streak

## API Overview

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/users/me`
- `GET /api/users/assigned-students`
- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/submissions`
- `POST /api/submissions` (multipart: `media`, `taskId`)
- `GET /api/submissions/leaderboard`
- `POST /api/feedback`
- `GET /api/feedback/:submissionId`
- `GET /api/admin/analytics`
- `GET|POST|PATCH|DELETE /api/admin/users`
- `POST /api/admin/assign-trainer`

## Environment Variables

### Backend (`backend/.env`)

Use `backend/.env.example`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/swarx
JWT_SECRET=replace_with_secure_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
USE_CLOUDINARY=false
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Frontend (`frontend/.env`)

Use `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Step-by-Step Run Instructions

1. **Start MongoDB**
   - Local MongoDB must be running on `mongodb://127.0.0.1:27017`.

2. **Backend setup**
   ```bash
   cd swarx-mvp/backend
   cp .env.example .env
   pnpm install
   pnpm run seed
   pnpm run dev
   ```
   Backend runs at `http://localhost:5000`.

3. **Frontend setup**
   ```bash
   cd swarx-mvp/frontend
   cp .env.example .env
   pnpm install
   pnpm run dev
   ```
   Frontend runs at `http://localhost:5173`.

4. **Login credentials (seed data)**
   - Admin: `admin@swarx.com` / `password123`
   - Trainer: `trainer@swarx.com` / `password123`
   - Student: `student@swarx.com` / `password123`

## Notes

- AI feedback is intentionally dummy/modular in `backend/src/services/aiFeedback.service.js` so OpenAI can be added later.
- Speech-to-text is placeholder in `backend/src/services/speech.service.js`.
- Local uploads are available under `/uploads`.
