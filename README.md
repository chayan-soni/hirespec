# HireSpec - AI-Powered Recruitment Platform

A full-stack intelligent hiring platform with AI interviews, live quizzes, coding contests, ATS screening, and job preparation features.

## Quick Start

### Prerequisites
- Node.js ≥ 18.x
- MongoDB (local or MongoDB Atlas)
- Redis (optional, for caching)

### 1. Clone & Setup Backend

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/hirespec
GROQ_API_KEY=your_key
GEMINI_API_KEY=your_key
PINECONE_FACE_API_KEY=your_key
PINECONE_FACE_INDEX=face-recognition
JWT_SECRET=your_secret
REDIS_URL=redis://localhost:6379
```

Start backend:
```bash
npm run dev
```
Backend: `http://localhost:5000`

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend: `http://localhost:5173`

## Features

### For Candidates
- **Browse Jobs** with ATS matching scores
- **Job Prep** - Company-specific interview preparation with 8+ companies
- **Take Quiz** - Answer company prep questions
- **AI Interview** - Mock interviews with AI
- **Coding Practice** - DSA problems with code execution
- **Resume Verification** - AI-powered authenticity checks
- **Leaderboard & Analytics** - Track performance

### For Companies
- **Post Jobs** with eligibility criteria
- **ATS Screening** - Auto-resume parsing and scoring
- **Manage Candidates** - Shortlist, interview, score
- **Create Quizzes** - AI-generated or custom questions
- **Live Quiz Hosting** - Real-time with WebSocket
- **Coding Contests** - Multi-language support
- **Analytics Dashboard** - Recruitment insights

### Core Features
- ✅ AI Interview Room with live feedback
- ✅ Face Detection Proctoring
- ✅ Real-time WebSocket communication
- ✅ Code Execution Engine (JavaScript, Python, C++, Java)
- ✅ Email Notifications & OTP
- ✅ JWT Authentication
- ✅ Rate Limiting & Security Headers
- ✅ Resume Parser with skill extraction

## Tech Stack

**Frontend:**
- React 18, Vite, React Router v6
- Monaco Editor, Socket.IO Client
- face-api.js (proctoring), Framer Motion
- Lucide React Icons

**Backend:**
- Node.js, Express.js, Socket.IO
- MongoDB + Mongoose
- Groq SDK, Google Gemini API
- Pinecone (vector DB), Redis
- JWT, Nodemailer, Multer

## Demo Accounts

| Account | Username | Password |
|---------|----------|----------|
| Student | `demo_student` | `demo123` |
| Company | `demo_company` | `demo123` |
| Recruiter | `demo_recruiter` | `demo123` |

## Company Prep Feature

### Available Companies
Google • Amazon • Microsoft • Meta • Apple • Tesla • Netflix • LinkedIn

Each company includes 5 prep questions (technical, behavioral, coding) with difficulty levels and sample answers.

**Access:** Navigate to `/job-prep` or click "Job Prep" in navbar

## Core API Endpoints

### Job Prep
- `GET /api/job-prep/companies` - Get all companies
- `GET /api/job-prep/company/:name` - Get company profile & questions

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/seed-demo` - Create demo accounts

### Jobs
- `GET /api/jobs/browse` - Browse all jobs
- `POST /api/jobs/:jobId/apply` - Apply to job
- `GET /api/jobs/kanban/:userId` - Get application status

### Quizzes
- `GET /api/quiz/my-quizzes` - Get user's quizzes
- `POST /api/quiz/create` - Create quiz
- `POST /api/quiz/:quizId/start` - Start quiz

### Interviews
- `POST /api/interview/start` - Start interview
- `POST /api/ai-interview/:sessionId/next-question` - Get next question

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `GROQ_API_KEY` | Yes | Groq API key for AI |
| `PINECONE_FACE_API_KEY` | Yes | Pinecone API key |
| `PINECONE_FACE_INDEX` | Yes | Pinecone index name |
| `GEMINI_API_KEY` | No | Google Gemini API |
| `REDIS_URL` | No | Redis connection |
| `JWT_SECRET` | No | JWT secret (default available) |

## Build & Deploy

### Production Build
```bash
cd frontend
npm run build    # creates dist/
cd ../backend
npm install --production
```

### Deployment Options
- **Frontend:** Vercel, Netlify, Cloudflare Pages
- **Backend:** Heroku, Railway, Render, AWS
- **Database:** MongoDB Atlas
- **Storage:** AWS S3, CloudStorage

## Repository

**GitHub:** https://github.com/chayan-soni/hirespec

## License

MIT License
