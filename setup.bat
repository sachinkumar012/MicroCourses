@echo off
echo 🚀 Setting up MicroCourses LMS...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ and try again.
    pause
    exit /b 1
)

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is not installed. Please install PostgreSQL and try again.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
call npm run install-all

echo 🔧 Setting up environment...
if not exist .env (
    copy env.example .env
    echo ✅ Created .env file from template. Please edit it with your database credentials.
)

echo 🗄️ Setting up database...
echo Please ensure PostgreSQL is running and create a database named 'microcourses'
echo Then run the following commands:
echo psql -d microcourses -f server/database/schema.sql
echo psql -d microcourses -f server/database/seed.sql

echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your database credentials
echo 2. Set up the PostgreSQL database using the commands above
echo 3. Run 'npm run dev' to start the development server
echo.
echo Test credentials:
echo Admin: admin@microcourses.com / password123
echo Creator: creator@microcourses.com / password123
echo Learner: learner@microcourses.com / password123
pause
