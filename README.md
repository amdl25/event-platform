# EventHub – Event Discovery & Ticketing Platform

Full-stack web platform for discovering, organizing and attending events. Attendees can browse and filter events, get personalized recommendations, buy tickets online and download them as PDFs. Organizers manage their events and follow analytics, while admins verify organizations and moderate the platform.

## Features

**For attendees**
- Event feed, category browsing, search and filtering, weekend feed and detailed event pages
- Recommendation wizard that suggests events based on the user's preferences
- Ticket purchase with Stripe Checkout, multiple ticket types and downloadable PDF tickets
- Calendar view and personal events
- Loyalty points wallet and referral bonus
- Email notifications

**For organizers**
- Dashboard with overview, events management, analytics charts, billing and settings

**For admins**
- Dashboard, events, organizations and participants management
- Organization verification queue and platform settings

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, React Router, TanStack Query, Axios, FullCalendar, Recharts, jsPDF, html2canvas |
| Backend | Node.js (ES modules), Express, Sequelize, JWT, bcrypt, Nodemailer, PDFKit, Multer |
| Database | PostgreSQL |
| Services | Stripe (payments), Cloudinary (image uploads) |
| Deployment | Dockerfile and `railway.json` for the backend |

## Project structure

```
backend/
  config/        database connection
  controllers/   request handlers
  middleware/    authentication and authorization
  models/        Sequelize models (accounts, events, ticket types, loyalty, ...)
  routes/        auth, events, categories, users, organizer, admin, contact
  services/      email and PDF ticket generation
  scripts/       maintenance and seed scripts
  seed.js        demo data
frontend/
  src/pages/       application pages (public, organizer and admin areas)
  src/components/  reusable UI components
  src/hooks/       custom hooks
```

## Getting started

### Prerequisites
- Node.js 18 or newer
- A PostgreSQL database
- Optional, for the full feature set: a Stripe account (test keys), an SMTP account for emails (for example Gmail with an app password) and a Cloudinary account

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database: either a single URL ...
DATABASE_URL=postgres://user:password@localhost:5432/eventhub
# ... or separate values
# DB_HOST=localhost
# DB_NAME=eventhub
# DB_USER=postgres
# DB_PASS=

JWT_SECRET=change-me
JWT_EXPIRES_IN=7d

STRIPE_SECRET_KEY=sk_test_...

EMAIL_USER=you@example.com
EMAIL_PASS=app-password
EMAIL_FROM=EventHub <you@example.com>
CONTACT_EMAIL=you@example.com

CLOUDINARY_URL=cloudinary://key:secret@cloud-name
LOYALTY_POINTS_PER_RON=1
```

Start the API (tables are created automatically on startup):

```bash
npm run dev      # with nodemon
# or
npm start
```

Optional scripts:

```bash
node seed.js                  # demo data (recreates the schema, existing tables are dropped)
node scripts/createAdmin.js   # creates an admin account, review the credentials in the file first
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend calls the API at `http://localhost:5000` by default. Set `VITE_API_URL` to change it.

## Notes
- Demo data is in Romanian.
- Never commit your `.env` file.
