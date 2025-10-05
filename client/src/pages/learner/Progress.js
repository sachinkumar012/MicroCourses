import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Play, Award, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

const Progress = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    const { data: overviewData, isLoading: overviewLoading } = useQuery(
        'progress-overview',
        async () => {
            const response = await api.get('/progress/overview');
            return response.data;
        },
        {
            enabled: !!user
        }
    );

    const { data: certificates, isLoading: certificatesLoading } = useQuery(
        'my-certificates',
        async () => {
            const response = await api.get('/certificates/my-certificates');
            return response.data;
        },
        {
            enabled: !!user
        }
    );

    const getProgressColor = (percentage) => {
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 60) return 'bg-yellow-500';
        if (percentage >= 40) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const getProgressTextColor = (percentage) => {
        if (percentage >= 80) return 'text-green-700';
        if (percentage >= 60) return 'text-yellow-700';
        if (percentage >= 40) return 'text-orange-700';
        return 'text-red-700';
    };

    if (overviewLoading) {
        return <LoadingSpinner size="large" className="py-20" />;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">My Progress</h1>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('certificates')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'certificates'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Certificates ({certificates?.items?.length || 0})
                        </button>
                    </nav>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* Statistics */}
                    {overviewData?.statistics && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="card text-center">
                                <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                                    <Play className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{overviewData.statistics.totalCourses}</h3>
                                <p className="text-gray-600">Total Courses</p>
                            </div>

                            <div className="card text-center">
                                <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{overviewData.statistics.completedCourses}</h3>
                                <p className="text-gray-600">Completed</p>
                            </div>

                            <div className="card text-center">
                                <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-purple-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{overviewData.statistics.totalCompletedLessons}</h3>
                                <p className="text-gray-600">Lessons Completed</p>
                            </div>

                            <div className="card text-center">
                                <div className="bg-orange-100 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                                    <Award className="h-6 w-6 text-orange-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{certificates?.items?.length || 0}</h3>
                                <p className="text-gray-600">Certificates</p>
                            </div>
                        </div>
                    )}

                    {/* Course Progress */}
                    <div className="card">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Course Progress</h2>

                        {overviewData?.items?.length > 0 ? (
                            <div className="space-y-6">
                                {overviewData.items.map((course) => (
                                    <div key={course.course_id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{course.course_title}</h3>
                                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                                    <Clock className="h-4 w-4 mr-1" />
                                                    <span>Last activity: {course.last_activity ? new Date(course.last_activity).toLocaleDateString() : 'Never'}</span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className={`text-lg font-bold ${getProgressTextColor(course.progress_percentage)}`}>
                                                    {course.progress_percentage}%
                                                </div>
                                                {course.is_completed && (
                                                    <div className="text-xs text-green-600 font-medium">✓ Completed</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex-1 mr-4">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(course.progress_percentage)}`}
                                                        style={{ width: `${course.progress_percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div className="text-sm text-gray-500">
                                                {course.completed_lessons} / {course.total_lessons} lessons
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <div className="text-sm text-gray-600">
                                                Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}
                                            </div>

                                            <Link
                                                to={`/courses/${course.course_id}`}
                                                className="btn-primary text-sm"
                                            >
                                                {course.is_completed ? 'Review Course' : 'Continue Learning'}
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-gray-400 mb-4">
                                    <Play className="h-16 w-16 mx-auto" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No enrolled courses</h3>
                                <p className="text-gray-600 mb-6">Start your learning journey by enrolling in a course.</p>
                                <Link to="/courses" className="btn-primary">
                                    Browse Courses
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'certificates' && (
                <div>
                    {certificatesLoading ? (
                        <LoadingSpinner size="large" className="py-20" />
                    ) : certificates?.items?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {certificates.items.map((certificate) => (
                                <div key={certificate.id} className="card text-center">
                                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-6 mb-4">
                                        <Award className="h-16 w-16 text-white mx-auto" />
                                    </div>

                                    <h3 className="font-semibold text-gray-900 mb-2">{certificate.course_title}</h3>
                                    <p className="text-sm text-gray-600 mb-4">{certificate.course_description}</p>

                                    <div className="space-y-2 text-sm text-gray-500 mb-4">
                                        <p>Issued: {new Date(certificate.issued_at).toLocaleDateString()}</p>
                                        <p>Creator: {certificate.creator_first_name} {certificate.creator_last_name}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <button className="btn-outline w-full text-sm">
                                            Download PDF
                                        </button>
                                        <button
                                            onClick={() => window.open(`/certificates/verify/${certificate.serial_hash}`, '_blank')}
                                            className="btn-secondary w-full text-sm"
                                        >
                                            Verify Certificate
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="text-gray-400 mb-4">
                                <Award className="h-16 w-16 mx-auto" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates yet</h3>
                            <p className="text-gray-600 mb-6">Complete courses to earn certificates.</p>
                            <Link to="/courses" className="btn-primary">
                                Browse Courses
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Progress;
