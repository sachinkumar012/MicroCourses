import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { api } from '../../services/api';
import { Play, Clock, User, Star, Search } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

const Courses = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [hasNextPage, setHasNextPage] = useState(false);

    const { data, isLoading, error, refetch } = useQuery(
        ['courses', currentPage],
        async () => {
            const response = await api.get('/courses', {
                params: {
                    limit: 12,
                    offset: currentPage * 12
                }
            });
            return response.data;
        },
        {
            keepPreviousData: true,
            onSuccess: (data) => {
                setHasNextPage(!!data.next_offset);
            }
        }
    );

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(0);
        refetch();
    };

    const handleLoadMore = () => {
        setCurrentPage(prev => prev + 1);
    };

    const formatDuration = (seconds) => {
        if (!seconds) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    if (isLoading && !data) {
        return <LoadingSpinner size="large" className="py-20" />;
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <p className="text-red-600">Error loading courses. Please try again.</p>
                <button onClick={() => refetch()} className="btn-primary mt-4">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Browse Courses</h1>

                {/* Search */}
                <form onSubmit={handleSearch} className="max-w-md">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search courses..."
                            className="input-field pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </form>
            </div>

            {/* Courses Grid */}
            {data?.items?.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {data.items.map((course) => (
                            <div key={course.id} className="card hover:shadow-lg transition-shadow duration-200">
                                {course.thumbnail_url && (
                                    <div className="aspect-video bg-gray-200 rounded-lg mb-4 overflow-hidden">
                                        <img
                                            src={course.thumbnail_url}
                                            alt={course.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}

                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                                        {course.title}
                                    </h3>

                                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                        {course.description}
                                    </p>

                                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center">
                                                <User className="h-4 w-4 mr-1" />
                                                <span>{course.creator_first_name} {course.creator_last_name}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <Play className="h-4 w-4 mr-1" />
                                                <span>{course.lesson_count} lessons</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="text-lg font-bold text-primary-600">
                                            ${course.price || 'Free'}
                                        </div>

                                        <Link
                                            to={`/courses/${course.id}`}
                                            className="btn-primary text-sm"
                                        >
                                            {course.is_enrolled ? 'Continue Learning' : 'View Course'}
                                        </Link>
                                    </div>

                                    {course.is_enrolled && (
                                        <div className="mt-2 text-xs text-green-600 font-medium">
                                            ✓ Enrolled
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More */}
                    {hasNextPage && (
                        <div className="text-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoading}
                                className="btn-outline"
                            >
                                {isLoading ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                                        Loading...
                                    </div>
                                ) : (
                                    'Load More Courses'
                                )}
                            </button>
                        </div>
                    )}

                    {/* Pagination Info */}
                    <div className="text-center text-sm text-gray-500 mt-4">
                        Showing {data.items.length} of {data.total} courses
                    </div>
                </>
            ) : (
                <div className="text-center py-20">
                    <div className="text-gray-400 mb-4">
                        <Play className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
                    <p className="text-gray-600">
                        {searchTerm ? 'Try adjusting your search terms.' : 'No courses are available at the moment.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default Courses;
