import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Users, Award, Play, ArrowRight } from 'lucide-react';

const Home = () => {
    const { isAuthenticated, user } = useAuth();

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-5xl font-bold mb-6">
                        Learn, Create, and Grow with MicroCourses
                    </h1>
                    <p className="text-xl mb-8 max-w-2xl mx-auto">
                        A comprehensive learning management system where creators can build amazing courses
                        and learners can acquire new skills with certificates upon completion.
                    </p>

                    {isAuthenticated ? (
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/courses" className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center">
                                Browse Courses
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                            {user?.role === 'creator' && (
                                <Link to="/creator/dashboard" className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center">
                                    Creator Dashboard
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/register" className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center">
                                Get Started
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                            <Link to="/login" className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center">
                                Sign In
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Why Choose MicroCourses?
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Our platform provides everything you need for effective online learning and course creation.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="bg-primary-100 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                                <BookOpen className="h-10 w-10 text-primary-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                Comprehensive Courses
                            </h3>
                            <p className="text-gray-600">
                                Access a wide variety of courses created by expert instructors.
                                Each course includes video lessons, transcripts, and progress tracking.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="bg-primary-100 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                                <Users className="h-10 w-10 text-primary-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                Creator-Friendly Platform
                            </h3>
                            <p className="text-gray-600">
                                Easy-to-use tools for course creators. Upload videos, manage lessons,
                                track student progress, and get detailed analytics.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="bg-primary-100 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                                <Award className="h-10 w-10 text-primary-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                Verified Certificates
                            </h3>
                            <p className="text-gray-600">
                                Earn verifiable certificates upon course completion.
                                Each certificate includes a unique serial hash for authenticity.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            How It Works
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Simple steps to start your learning journey or become a course creator.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h3 className="text-3xl font-bold text-gray-900 mb-6">
                                For Learners
                            </h3>
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                        1
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Browse Courses</h4>
                                        <p className="text-gray-600">Explore our catalog of published courses across various topics.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                        2
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Enroll & Learn</h4>
                                        <p className="text-gray-600">Enroll in courses and track your progress through video lessons.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Get Certified</h4>
                                        <p className="text-gray-600">Complete all lessons to earn a verifiable certificate.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-3xl font-bold text-gray-900 mb-6">
                                For Creators
                            </h3>
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                        1
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Apply as Creator</h4>
                                        <p className="text-gray-600">Submit your application with your expertise and portfolio.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                        2
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Create Courses</h4>
                                        <p className="text-gray-600">Build comprehensive courses with video lessons and transcripts.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Publish & Track</h4>
                                        <p className="text-gray-600">Submit for review and monitor student engagement and progress.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            {!isAuthenticated && (
                <section className="py-20 bg-primary-600 text-white">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-4xl font-bold mb-6">
                            Ready to Start Your Journey?
                        </h2>
                        <p className="text-xl mb-8 max-w-2xl mx-auto">
                            Join thousands of learners and creators who are already using MicroCourses
                            to achieve their educational goals.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/register" className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center">
                                Join as Learner
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                            <Link to="/register?role=creator" className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center">
                                Become a Creator
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Home;
