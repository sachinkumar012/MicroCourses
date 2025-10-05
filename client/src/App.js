import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// Components
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingSpinner from "./components/LoadingSpinner";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Learner pages
import Courses from "./pages/learner/Courses";
import CourseDetail from "./pages/learner/CourseDetail";
import LessonView from "./pages/learner/LessonView";
import Progress from "./pages/learner/Progress";

// Creator pages
import CreatorApply from "./pages/creator/CreatorApply";
import CreatorDashboard from "./pages/creator/CreatorDashboard";

// Admin pages
import AdminReviewCourses from "./pages/admin/AdminReviewCourses";
import AdminPanel from "./pages/admin/AdminPanel";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Learner routes */}
          <Route
            path="/courses"
            element={
              <ProtectedRoute allowedRoles={["learner", "creator", "admin"]}>
                <Courses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute allowedRoles={["learner", "creator", "admin"]}>
                <CourseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learn/:lessonId"
            element={
              <ProtectedRoute allowedRoles={["learner", "creator", "admin"]}>
                <LessonView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute allowedRoles={["learner", "creator", "admin"]}>
                <Progress />
              </ProtectedRoute>
            }
          />

          {/* Creator routes */}
          <Route
            path="/creator/apply"
            element={
              <ProtectedRoute allowedRoles={["creator"]}>
                <CreatorApply />
              </ProtectedRoute>
            }
          />
          <Route
            path="/creator/dashboard"
            element={
              <ProtectedRoute allowedRoles={["creator"]}>
                <CreatorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin/review/courses"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminReviewCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/panel"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
