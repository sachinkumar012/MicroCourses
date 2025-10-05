#!/bin/bash

echo "🚀 Setting up MicroCourses LMS..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL and try again."
    exit 1
fi

echo "📦 Installing dependencies..."
npm run install-all

echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    cp env.example .env
    echo "✅ Created .env file from template. Please edit it with your database credentials."
fi

echo "🗄️ Setting up database..."
echo "Please ensure PostgreSQL is running and create a database named 'microcourses'"
echo "Then run the following commands:"
echo "psql -d microcourses -f server/database/schema.sql"
echo "psql -d microcourses -f server/database/seed.sql"

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database credentials"
echo "2. Set up the PostgreSQL database using the commands above"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "Test credentials:"
echo "Admin: admin@microcourses.com / password123"
echo "Creator: creator@microcourses.com / password123"
echo "Learner: learner@microcourses.com / password123"
