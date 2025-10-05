# MicroCourses - Mini LMS Platform

A comprehensive Learning Management System (LMS) where creators can build courses, admins review content, and learners acquire skills with verified certificates.

## 🚀 Features

### Core Functionality
- **Multi-role System**: Learners, Creators, and Admins
- **Course Management**: Create, edit, and publish courses with video lessons
- **Progress Tracking**: Real-time progress monitoring and completion certificates
- **Auto-Transcripts**: Automatic transcript generation for video lessons
- **Certificate System**: Verifiable certificates with unique serial hashes
- **Review Process**: Admin approval workflow for course publication

### Technical Features
- **Rate Limiting**: 60 requests per minute per user
- **Idempotency**: All POST requests support Idempotency-Key headers
- **Pagination**: Comprehensive pagination with limit/offset parameters
- **Error Handling**: Uniform error response format
- **CORS**: Open CORS for development and production
- **Authentication**: JWT-based authentication system

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Database**: PostgreSQL with comprehensive schema
- **Authentication**: JWT tokens with role-based access control
- **API**: RESTful API with proper HTTP status codes
- **Middleware**: Rate limiting, idempotency, authentication, validation
- **Security**: Helmet, CORS, input validation, SQL injection protection

### Frontend (React)
- **UI Framework**: React 18 with modern hooks
- **Styling**: Tailwind CSS with custom components
- **State Management**: React Query for server state
- **Routing**: React Router with protected routes
- **Authentication**: Context-based auth with persistent tokens

## 📋 API Summary

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh JWT token

### Course Management
- `GET /api/courses` - List published courses (paginated)
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create new course (creator only)
- `PUT /api/courses/:id` - Update course (creator only)
- `POST /api/courses/:id/submit` - Submit course for review
- `DELETE /api/courses/:id` - Delete course (creator only)

### Lesson Management
- `GET /api/lessons/:id` - Get lesson details
- `POST /api/lessons` - Create lesson (creator only)
- `PUT /api/lessons/:id` - Update lesson (creator only)
- `DELETE /api/lessons/:id` - Delete lesson (creator only)
- `POST /api/lessons/reorder` - Reorder lessons in course

### Enrollment & Progress
- `POST /api/enrollments` - Enroll in course
- `GET /api/enrollments/my-enrollments` - Get user enrollments
- `POST /api/progress/lessons/:id` - Update lesson progress
- `POST /api/progress/lessons/:id/complete` - Mark lesson complete
- `GET /api/progress/courses/:id` - Get course progress
- `GET /api/progress/overview` - Get overall progress

### Certificates
- `GET /api/certificates/my-certificates` - Get user certificates
- `GET /api/certificates/:id` - Get certificate details
- `GET /api/certificates/verify/:hash` - Verify certificate (public)

### Admin Functions
- `GET /api/admin/creator-applications` - List creator applications
- `POST /api/admin/creator-applications/:id/review` - Review application
- `GET /api/admin/courses/review` - List courses for review
- `POST /api/admin/courses/:id/review` - Review course
- `GET /api/admin/dashboard` - Admin dashboard statistics

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts with role-based access
- **creator_applications**: Creator application submissions
- **courses**: Course information and status
- **lessons**: Individual lessons with transcripts
- **enrollments**: User course enrollments
- **lesson_progress**: Progress tracking per lesson
- **certificates**: Issued certificates with serial hashes
- **idempotency_keys**: Request deduplication tracking

### Key Relationships
- Users can have multiple roles (learner, creator, admin)
- Creators can create multiple courses
- Courses contain multiple lessons in ordered sequence
- Users can enroll in multiple courses
- Progress is tracked per lesson per user
- Certificates are issued upon 100% course completion

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd microcourses
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your database and JWT configuration
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb microcourses

   # Run schema and seed data
   psql -d microcourses -f server/database/schema.sql
   psql -d microcourses -f server/database/seed.sql
   ```

5. **Start the application**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🧪 Test User Credentials

### Admin User
- **Email**: admin@microcourses.com
- **Password**: password123
- **Role**: Admin (full system access)

### Creator User
- **Email**: creator@microcourses.com
- **Password**: password123
- **Role**: Creator (approved, can create courses)

### Learner User
- **Email**: learner@microcourses.com
- **Password**: password123
- **Role**: Learner (enrolled in sample courses)

## 📊 Seed Data

The database includes pre-populated data:
- 3 test users (admin, creator, learner)
- 2 published courses with 5 lessons each
- 1 pending course (draft status)
- Sample enrollment and progress data
- Auto-generated transcripts for all lessons

## 🔧 API Usage Examples

### User Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "learner"
  }'
```

### Course Creation (with Idempotency)
```bash
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "title": "Advanced JavaScript",
    "description": "Learn advanced JavaScript concepts",
    "price": 99.99,
    "thumbnailUrl": "https://example.com/thumb.jpg"
  }'
```

### Paginated Course Listing
```bash
curl "http://localhost:5000/api/courses?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Progress Update
```bash
curl -X POST http://localhost:5000/api/progress/lessons/LESSON_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"progressPercentage": 75}'
```

## 🛡️ Security Features

### Rate Limiting
- 60 requests per minute per user
- Returns `429` status with error code `RATE_LIMIT`
- Uses user ID for authenticated requests, IP for anonymous

### Idempotency
- All POST/PUT/PATCH requests support `Idempotency-Key` header
- Prevents duplicate operations
- Keys are stored with request hashes

### Error Handling
Uniform error response format:
```json
{
  "error": {
    "code": "FIELD_REQUIRED",
    "field": "email",
    "message": "Email is required"
  }
}
```

### Authentication
- JWT tokens with 7-day expiration
- Role-based access control
- Protected routes with middleware
- Optional authentication for public endpoints

## 📱 Frontend Pages

### Learner Pages
- `/courses` - Browse all published courses
- `/courses/:id` - Course details and enrollment
- `/learn/:lessonId` - Video lesson player with progress tracking
- `/progress` - Personal progress overview and certificates

### Creator Pages
- `/creator/apply` - Submit creator application
- `/creator/dashboard` - Manage courses and view analytics

### Admin Pages
- `/admin/review/courses` - Review and approve courses

## 🔄 Workflow

### Creator Application Process
1. User registers as creator
2. Submits application with bio, expertise, portfolio
3. Admin reviews and approves/rejects
4. Approved creators can create courses

### Course Publishing Process
1. Creator creates course and adds lessons
2. Submits course for review
3. Admin reviews content and approves/rejects
4. Approved courses become visible to learners

### Learning Process
1. Learner browses and enrolls in courses
2. Completes lessons with progress tracking
3. Receives certificate upon 100% completion
4. Certificate includes verifiable serial hash

## 🚀 Deployment

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=production
```

### Production Build
```bash
npm run build
# Serve the client/build directory with your web server
```

### Database Migration
Run the schema.sql file on your production database before deploying.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the API documentation above
- Review the test credentials for testing
- Examine the seed data for examples
- Check the database schema for data structure

---

**Built with ❤️ for educational excellence**
