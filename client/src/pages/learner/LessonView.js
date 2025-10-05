import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Play, ChevronLeft, ChevronRight, Clock, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const LessonView = () => {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [videoProgress, setVideoProgress] = useState(0);

    const { data: lesson, isLoading, error } = useQuery(
        ['lesson', lessonId],
        async () => {
            const response = await api.get(`/lessons/${lessonId}`);
            return response.data;
        }
    );

    const updateProgressMutation = useMutation(
        async (progressPercentage) => {
            const response = await api.post(`/progress/lessons/${lessonId}`, {
                progressPercentage
            });
            return response.data;
        },
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['course-progress']);
                queryClient.invalidateQueries(['progress-overview']);
            }
        }
    );

    const completeLessonMutation = useMutation(
        async () => {
            const response = await api.post(`/progress/lessons/${lessonId}/complete`);
            return response.data;
        },
        {
            onSuccess: () => {
                toast.success('Lesson completed!');
                queryClient.invalidateQueries(['course-progress']);
                queryClient.invalidateQueries(['progress-overview']);
            },
            onError: (error) => {
                toast.error(error.response?.data?.error?.message || 'Failed to complete lesson');
            }
        }
    );

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (lesson && !lesson.course_status === 'published') {
            toast.error('This lesson is not available');
            navigate('/courses');
        }
    }, [user, lesson, navigate]);

    const handleProgressChange = (percentage) => {
        setVideoProgress(percentage);
        updateProgressMutation.mutate(Math.round(percentage));
    };

    const handleCompleteLesson = () => {
        completeLessonMutation.mutate();
    };

    const handlePreviousLesson = () => {
        if (lesson?.navigation?.previous) {
            navigate(`/learn/${lesson.navigation.previous.id}`);
        }
    };

    const handleNextLesson = () => {
        if (lesson?.navigation?.next) {
            navigate(`/learn/${lesson.navigation.next.id}`);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:00` : `${minutes}:00`;
    };

    if (isLoading) {
        return <LoadingSpinner size="large" className="py-20" />;
    }

    if (error || !lesson) {
        return (
            <div className="text-center py-20">
                <p className="text-red-600">Lesson not found or error loading lesson.</p>
                <button onClick={() => navigate('/courses')} className="btn-primary mt-4">
                    Back to Courses
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate(`/courses/${lesson.course_id}`)}
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <ChevronLeft className="h-5 w-5 mr-2" />
                        Back to Course
                    </button>

                    <div className="text-sm text-gray-500">
                        Lesson {lesson.order_index} of {lesson.course_id ? 'X' : 'X'} {/* TODO: Get total lessons */}
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
                {lesson.description && (
                    <p className="text-gray-600">{lesson.description}</p>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Video Player */}
                <div className="lg:col-span-2">
                    <div className="card">
                        <div className="aspect-video bg-gray-900 rounded-lg mb-4 overflow-hidden">
                            {lesson.video_url ? (
                                <video
                                    controls
                                    className="w-full h-full"
                                    onTimeUpdate={(e) => {
                                        const video = e.target;
                                        const progress = (video.currentTime / video.duration) * 100;
                                        handleProgressChange(progress);
                                    }}
                                >
                                    <source src={lesson.video_url} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <div className="flex items-center justify-center h-full text-white">
                                    <div className="text-center">
                                        <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                        <p>Video not available</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Video Controls */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-gray-500">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>{formatDuration(lesson.duration)}</span>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                                        <div
                                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${videoProgress}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm text-gray-500">{Math.round(videoProgress)}%</span>
                                </div>

                                {videoProgress >= 90 && (
                                    <button
                                        onClick={handleCompleteLesson}
                                        disabled={completeLessonMutation.isLoading}
                                        className="btn-primary text-sm"
                                    >
                                        {completeLessonMutation.isLoading ? (
                                            <div className="flex items-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Completing...
                                            </div>
                                        ) : (
                                            <div className="flex items-center">
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Mark Complete
                                            </div>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between mt-6">
                        <button
                            onClick={handlePreviousLesson}
                            disabled={!lesson.navigation?.previous}
                            className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Previous Lesson
                        </button>

                        <button
                            onClick={handleNextLesson}
                            disabled={!lesson.navigation?.next}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next Lesson
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </button>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                    {/* Transcript */}
                    {lesson.transcript && (
                        <div className="card mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transcript</h3>
                            <div className="text-sm text-gray-600 leading-relaxed">
                                {lesson.transcript}
                            </div>
                        </div>
                    )}

                    {/* Course Progress */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Progress</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Overall Progress</span>
                                <span className="font-medium">{Math.round(videoProgress)}%</span>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${videoProgress}%` }}
                                ></div>
                            </div>

                            <div className="text-xs text-gray-500">
                                Complete this lesson to continue your progress
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LessonView;
