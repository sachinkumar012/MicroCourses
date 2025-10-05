import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { Play, Clock, User, CheckCircle, Lock, ArrowLeft } from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import toast from "react-hot-toast";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEnrolling, setIsEnrolling] = useState(false);

  const {
    data: course,
    isLoading,
    error,
  } = useQuery(["course", id], async () => {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  });

  const { data: enrollmentStatus } = useQuery(
    ["enrollment", id],
    async () => {
      const response = await api.get(`/enrollments/check/${id}`);
      return response.data;
    },
    {
      // Only run this query when we have a user AND a token exists in localStorage
      enabled: !!user && !!localStorage.getItem("token"),
    }
  );

  const enrollmentMutation = useMutation(
    async () => {
      const response = await api.post("/enrollments", { courseId: id });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success("Successfully enrolled in course!");
        queryClient.invalidateQueries(["enrollment", id]);
        queryClient.invalidateQueries(["course", id]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || "Failed to enroll");
      },
    }
  );

  const handleEnroll = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setIsEnrolling(true);
    try {
      await enrollmentMutation.mutateAsync();
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleStartLesson = (lessonId) => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!enrollmentStatus?.isEnrolled) {
      toast.error("Please enroll in this course first");
      return;
    }

    navigate(`/learn/${lessonId}`);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getTotalDuration = () => {
    if (!course?.lessons) return 0;
    return course.lessons.reduce(
      (total, lesson) => total + (lesson.duration || 0),
      0
    );
  };

  if (isLoading) {
    return <LoadingSpinner size="large" className="py-20" />;
  }

  if (error || !course) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600">
          Course not found or error loading course.
        </p>
        <button
          onClick={() => navigate("/courses")}
          className="btn-primary mt-4"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate("/courses")}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Courses
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Course Header */}
          <div className="card mb-6">
            {course.thumbnail_url && (
              <div className="aspect-video bg-gray-200 rounded-lg mb-6 overflow-hidden">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {course.title}
            </h1>

            <p className="text-gray-600 mb-6">{course.description}</p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  <span>
                    By {course.creator_first_name} {course.creator_last_name}
                  </span>
                </div>
                <div className="flex items-center">
                  <Play className="h-5 w-5 mr-2" />
                  <span>{course.lesson_count} lessons</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  <span>{formatDuration(getTotalDuration())}</span>
                </div>
              </div>

              <div className="text-2xl font-bold text-primary-600">
                ${course.price || "Free"}
              </div>
            </div>

            {/* Enroll Button */}
            {!enrollmentStatus?.isEnrolled ? (
              <button
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="btn-primary w-full py-3 text-lg"
              >
                {isEnrolling ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Enrolling...
                  </div>
                ) : (
                  "Enroll Now"
                )}
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">
                  You're enrolled in this course!
                </p>
              </div>
            )}
          </div>

          {/* Lessons List */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Course Lessons
            </h2>

            {course.lessons?.length > 0 ? (
              <div className="space-y-4">
                {course.lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className={`border rounded-lg p-4 ${
                      enrollmentStatus?.isEnrolled
                        ? "border-gray-200 hover:border-primary-300 cursor-pointer"
                        : "border-gray-100 bg-gray-50"
                    } transition-colors duration-200`}
                    onClick={() =>
                      enrollmentStatus?.isEnrolled &&
                      handleStartLesson(lesson.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            enrollmentStatus?.isEnrolled
                              ? "bg-primary-100 text-primary-600"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {index + 1}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {lesson.title}
                          </h3>
                          {lesson.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {lesson.description}
                            </p>
                          )}
                          {lesson.duration && (
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{formatDuration(lesson.duration)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center">
                        {enrollmentStatus?.isEnrolled ? (
                          <Play className="h-5 w-5 text-primary-600" />
                        ) : (
                          <Lock className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No lessons available yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Course Information
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  What you'll learn
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Complete understanding of the subject</li>
                  <li>• Practical skills and knowledge</li>
                  <li>• Real-world applications</li>
                  <li>• Certificate upon completion</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Requirements</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Basic computer skills</li>
                  <li>• Internet connection</li>
                  <li>• Motivation to learn</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Course includes
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {course.lesson_count} video lessons</li>
                  <li>• Auto-generated transcripts</li>
                  <li>• Progress tracking</li>
                  <li>• Certificate of completion</li>
                  <li>• Lifetime access</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
