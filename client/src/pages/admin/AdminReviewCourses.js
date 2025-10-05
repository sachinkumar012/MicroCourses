import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, CheckCircle, X, Clock, User, MessageSquare } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminReviewCourses = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [reviewData, setReviewData] = useState({
        status: '',
        adminNotes: ''
    });

    const { data: courses, isLoading } = useQuery(
        'admin-courses',
        async () => {
            const response = await api.get('/admin/courses/review');
            return response.data;
        },
        {
            enabled: !!user && user.role === 'admin'
        }
    );

    const reviewCourseMutation = useMutation(
        async ({ courseId, status, adminNotes }) => {
            const response = await api.post(`/admin/courses/${courseId}/review`, {
                status,
                adminNotes
            });
            return response.data;
        },
        {
            onSuccess: () => {
                toast.success('Course review submitted successfully!');
                setSelectedCourse(null);
                setReviewData({ status: '', adminNotes: '' });
                queryClient.invalidateQueries('admin-courses');
            },
            onError: (error) => {
                toast.error(error.response?.data?.error?.message || 'Failed to review course');
            }
        }
    );

    const handleReviewCourse = (course) => {
        setSelectedCourse(course);
        setReviewData({
            status: '',
            adminNotes: ''
        });
    };

    const handleSubmitReview = (e) => {
        e.preventDefault();

        if (!reviewData.status) {
            toast.error('Please select a status');
            return;
        }

        reviewCourseMutation.mutate({
            courseId: selectedCourse.id,
            status: reviewData.status,
            adminNotes: reviewData.adminNotes
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'pending_review':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'published':
                return <CheckCircle className="h-4 w-4" />;
            case 'pending_review':
                return <Clock className="h-4 w-4" />;
            case 'rejected':
                return <X className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="card text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
                    <p className="text-gray-600">
                        You don't have permission to access this page.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <LoadingSpinner size="large" className="py-20" />;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Course Review Dashboard</h1>
                <p className="text-gray-600 mt-2">Review and approve courses submitted by creators</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="card text-center">
                    <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                        {courses?.items?.filter(c => c.status === 'pending_review').length || 0}
                    </h3>
                    <p className="text-gray-600">Pending Review</p>
                </div>

                <div className="card text-center">
                    <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                        {courses?.items?.filter(c => c.status === 'published').length || 0}
                    </h3>
                    <p className="text-gray-600">Published</p>
                </div>

                <div className="card text-center">
                    <div className="bg-red-100 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                        <X className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                        {courses?.items?.filter(c => c.status === 'rejected').length || 0}
                    </h3>
                    <p className="text-gray-600">Rejected</p>
                </div>

                <div className="card text-center">
                    <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{courses?.items?.length || 0}</h3>
                    <p className="text-gray-600">Total Courses</p>
                </div>
            </div>

            {/* Courses List */}
            <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Courses to Review</h2>

                {courses?.items?.length > 0 ? (
                    <div className="space-y-4">
                        {courses.items.map((course) => (
                            <div key={course.id} className="border border-gray-200 rounded-lg p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-4 mb-3">
                                            <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
                                            <div className={`flex items-center px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(course.status)}`}>
                                                {getStatusIcon(course.status)}
                                                <span className="ml-2 capitalize">{course.status.replace('_', ' ')}</span>
                                            </div>
                                        </div>

                                        <p className="text-gray-600 mb-4">{course.description}</p>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <User className="h-4 w-4 mr-2" />
                                                <span>{course.creator_first_name} {course.creator_last_name}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                <span>{course.lesson_count} lessons</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span>Created: {new Date(course.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span>${course.price || 'Free'}</span>
                                            </div>
                                        </div>

                                        {course.admin_notes && (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                                                <h4 className="font-medium text-yellow-900 mb-1">Previous Admin Notes:</h4>
                                                <p className="text-yellow-800 text-sm">{course.admin_notes}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-2 ml-4">
                                        <Link
                                            to={`/courses/${course.id}`}
                                            className="btn-secondary text-sm flex items-center"
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            View
                                        </Link>

                                        {course.status === 'pending_review' && (
                                            <button
                                                onClick={() => handleReviewCourse(course)}
                                                className="btn-primary text-sm"
                                            >
                                                Review
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-gray-400 mb-4">
                            <MessageSquare className="h-16 w-16 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No courses to review</h3>
                        <p className="text-gray-600">All courses have been reviewed.</p>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {selectedCourse && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Review Course: {selectedCourse.title}
                        </h2>

                        <div className="mb-6">
                            <h3 className="font-medium text-gray-900 mb-2">Course Details</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-gray-600 mb-2">{selectedCourse.description}</p>
                                <div className="text-sm text-gray-500">
                                    <p>Creator: {selectedCourse.creator_first_name} {selectedCourse.creator_last_name}</p>
                                    <p>Lessons: {selectedCourse.lesson_count}</p>
                                    <p>Price: ${selectedCourse.price || 'Free'}</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitReview} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Review Decision *
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="published"
                                            checked={reviewData.status === 'published'}
                                            onChange={(e) => setReviewData({ ...reviewData, status: e.target.value })}
                                            className="mr-2"
                                        />
                                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                        <span>Approve & Publish</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="rejected"
                                            checked={reviewData.status === 'rejected'}
                                            onChange={(e) => setReviewData({ ...reviewData, status: e.target.value })}
                                            className="mr-2"
                                        />
                                        <X className="h-4 w-4 text-red-600 mr-2" />
                                        <span>Reject</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-2">
                                    Admin Notes (Optional)
                                </label>
                                <textarea
                                    id="adminNotes"
                                    rows={4}
                                    className="input-field"
                                    placeholder="Add any feedback or notes for the creator..."
                                    value={reviewData.adminNotes}
                                    onChange={(e) => setReviewData({ ...reviewData, adminNotes: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCourse(null)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={reviewCourseMutation.isLoading}
                                    className="btn-primary"
                                >
                                    {reviewCourseMutation.isLoading ? (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Submitting...
                                        </div>
                                    ) : (
                                        'Submit Review'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReviewCourses;
