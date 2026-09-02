# VeloraCRM

### Turn leads into relationships.

VeloraCRM is an AI-powered client lead management system built as **Task 2 of the Future Interns Full Stack Web Development Internship**.

It is designed for modern revenue teams to manage website-generated leads through a premium dark SaaS workspace combining pipeline management, activity tracking, analytics, follow-ups and a recommendation-only AI copilot.

---

## 🎯 Internship Project

**Program:** Future Interns — Full Stack Web Development Internship  
**Task:** Task 2 — Client Lead Management System  
**Project:** VeloraCRM

VeloraCRM was developed to manage client leads generated through website contact forms and provide a complete workflow from lead capture to conversion.

---

## ✨ Features

- Admin authentication with hashed passwords and HTTP-only JWT cookies
- Lead CRUD operations
- Lead search, filtering, sorting and pagination
- Kanban pipeline with drag-and-drop status changes
- Lead profiles with notes and follow-ups
- AI-powered lead insights
- Dashboard KPIs and analytics
- Conversion funnel visualization
- Recent activity tracking
- Follow-up management
- Overdue follow-up tracking
- Analytics and revenue forecasting
- ROI analysis by source, campaign and month
- Velora AI assistant
- AI-generated email drafts
- Email drafts never auto-send
- Public `/contact` form for lead capture
- Persistent activity timeline
- Demo seed data with realistic leads
- CSV lead export
- Recommendation-only AI with deterministic fallback

---

## 🛠️ Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Recharts
- Lucide React
- Framer Motion
- dnd-kit

### Backend

- Next.js App Router
- Next.js API Route Handlers
- MongoDB
- Mongoose
- Zod validation

### Authentication & Security

- JWT sessions using `jose`
- bcrypt password hashing
- HTTP-only session cookies
- Protected application pages
- Protected API routes

---

## 🏗️ Architecture

```text
veloracrm/
│
├── app/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── pipeline/
│   │   ├── analytics/
│   │   ├── ai/
│   │   ├── activity/
│   │   └── settings/
│   │
│   ├── api/
│   │   ├── auth/
│   │   ├── leads/
│   │   ├── followups/
│   │   ├── analytics/
│   │   ├── activity/
│   │   ├── ai/
│   │   ├── contact/
│   │   └── settings/
│   │
│   └── contact/
│
├── components/
│   ├── dashboard/
│   ├── leads/
│   ├── ai/
│   └── ...
│
├── lib/
│   ├── ai/
│   ├── analytics/
│   ├── auth/
│   ├── db/
│   └── validation/
│
├── models/
│   └── Mongoose schemas
│
├── scripts/
│   └── seed.ts
│
└── proxy.ts


## **🤖 AI Layer**

VeloraCRM includes an AI assistant designed to help users understand and manage leads more efficiently.

### AI Capabilities

- Lead analysis and summaries
- Lead prioritization assistance
- Follow-up recommendations
- Sales insights
- Related lead suggestions
- Natural-language questions about CRM data
- Deterministic fallback responses when the AI provider is unavailable

###**AI Reliability**

The AI service includes:

- Request timeout protection
- Automatic retry for temporary provider errors
- Handling for rate-limit responses
- Handling for server-side provider failures
- Deterministic fallback responses to keep the assistant usable even when the external AI service is unavailable

---

## **📊 Analytics & Forecasting**

The analytics dashboard provides an overview of CRM performance and sales activity.

It includes:

- Total leads
- Conversion rate
- Revenue metrics
- Lead sources
- Sales funnel
- Pipeline performance
- Follow-up activity
- Deal risk indicators
- Speed-to-lead metrics
- Performance trends

---

## **🗄️ MongoDB Setup**

VeloraCRM uses MongoDB Atlas for persistent data storage.

Create a MongoDB Atlas cluster and configure the connection string in your environment variables.

Example:

    MONGODB_URI=mongodb://username:password@host1:27017,host2:27017,host3:27017/?ssl=true&replicaSet=replicaSetName&authSource=admin&appName=VeloraCRM

Make sure your MongoDB Atlas network access settings allow connections from your development or deployment environment.

---

## **🔐 Environment Variables**

Create a `.env.local` file in the project root:

    MONGODB_URI=your_mongodb_connection_string
    SESSION_SECRET=your_session_secret
    AI_API_KEY=your_ai_api_key
    AI_BASE_URL=your_ai_provider_base_url
    AI_MODEL=your_ai_model

Never commit `.env.local` or any file containing production secrets to GitHub.

---

## **🚀 Installation**

Clone the repository:

    git clone https://github.com/spoorthikengol/FUTURE_FS_02.git

Navigate into the project:

    cd FUTURE_FS_02

Install dependencies:

    npm install

Create your `.env.local` file and configure the required environment variables.

---

## **💻 Local Development**

Start the development server:

    npm run dev

Open the application at:

    http://localhost:3000

Build the project for production:

    npm run build

Run TypeScript validation:

    npx tsc --noEmit

---

## **👤 Demo Login**

For demonstration purposes, the application includes a demo login account.

**Email:**

    ivan.p@example.net

**Password:**

    VeloraAdmin123!

---

## **🔌 API Documentation**

The application provides API routes for:

- Authentication
- Lead management
- Lead search and filtering
- Lead export
- Follow-ups
- Analytics
- AI assistant
- Activity tracking
- Contact forms

All protected API routes require an authenticated session.

---

## **🔄 Lead Management Workflow**

The CRM supports the complete lead management workflow:

**Website Contact → Lead Creation → Qualification → Pipeline Management → Follow-up → Conversion**

Users can:

- Create new leads
- Search leads globally
- Filter leads by status, source and priority
- Update lead information
- Move leads through the sales pipeline
- Add notes
- Schedule follow-ups
- Track overdue follow-ups
- Mark follow-ups as completed
- Reschedule follow-ups
- Delete leads
- Export filtered leads as CSV
- Analyze lead performance

---

## **🌐 Deployment**

The application is deployed using Vercel.

**Production:**

    https://veloracrm.vercel.app

The project uses MongoDB Atlas for production database storage.

Environment variables must be configured separately in the Vercel project settings.

---

## 🔮 **Future Improvements**

Potential future enhancements include:

- Advanced AI-powered lead scoring
- Automated email follow-ups
- WhatsApp integration
- CRM email synchronization
- Advanced sales forecasting
- Role-based permissions
- Team collaboration
- Custom analytics reports
- Notification integrations
- Enhanced AI sales recommendations

---

## **🎓 Internship Context**

This project was developed as part of the **Future Interns Full Stack Web Development Internship — Task 2**.

The objective was to build a practical client lead management system capable of handling lead generation, lead tracking, follow-ups, analytics and AI-assisted CRM operations.

---

## **📄 License**

This project is created for educational and internship purposes.

---

## **👩‍💻 Author**

**Spoorthi K P**

GitHub: `https://github.com/spoorthikengol/FUTURE_FS_02`

Project: **VeloraCRM — Future Interns Task 2**
