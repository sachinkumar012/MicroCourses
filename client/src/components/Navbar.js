import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, User, LogOut, BookOpen, Settings } from 'lucide-react';

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsMenuOpen(false);
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-800';
            case 'creator':
                return 'bg-blue-100 text-blue-800';
            case 'learner':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <nav className="bg-white shadow-lg border-b border-gray-200">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2">
                        <BookOpen className="h-8 w-8 text-primary-600" />
                        <span className="text-xl font-bold text-gray-900">MicroCourses</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        {isAuthenticated ? (
                            <>
                                <Link to="/courses" className="text-gray-700 hover:text-primary-600 transition-colors">
                                    Courses
                                </Link>
                                <Link to="/progress" className="text-gray-700 hover:text-primary-600 transition-colors">
                                    Progress
                                </Link>

                                {user?.role === 'creator' && (
                                    <Link to="/creator/dashboard" className="text-gray-700 hover:text-primary-600 transition-colors">
                                        Creator Dashboard
                                    </Link>
                                )}

                                {user?.role === 'admin' && (
                                    <Link to="/admin/review/courses" className="text-gray-700 hover:text-primary-600 transition-colors">
                                        Admin Panel
                                    </Link>
                                )}

                                {/* User Menu */}
                                <div className="relative group">
                                    <button className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors">
                                        <User className="h-5 w-5" />
                                        <span>{user?.firstName}</span>
                                        <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user?.role)}`}>
                                            {user?.role}
                                        </span>
                                    </button>

                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                        <div className="py-2">
                                            <div className="px-4 py-2 border-b border-gray-100">
                                                <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                                                <p className="text-xs text-gray-500">{user?.email}</p>
                                            </div>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-gray-700 hover:text-primary-600 transition-colors">
                                    Login
                                </Link>
                                <Link to="/register" className="btn-primary">
                                    Register
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-200">
                        <div className="flex flex-col space-y-4">
                            {isAuthenticated ? (
                                <>
                                    <Link
                                        to="/courses"
                                        className="text-gray-700 hover:text-primary-600 transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Courses
                                    </Link>
                                    <Link
                                        to="/progress"
                                        className="text-gray-700 hover:text-primary-600 transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Progress
                                    </Link>

                                    {user?.role === 'creator' && (
                                        <Link
                                            to="/creator/dashboard"
                                            className="text-gray-700 hover:text-primary-600 transition-colors"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Creator Dashboard
                                        </Link>
                                    )}

                                    {user?.role === 'admin' && (
                                        <Link
                                            to="/admin/review/courses"
                                            className="text-gray-700 hover:text-primary-600 transition-colors"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Admin Panel
                                        </Link>
                                    )}

                                    <div className="pt-4 border-t border-gray-200">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <User className="h-5 w-5 text-gray-500" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                                                <p className="text-xs text-gray-500">{user?.email}</p>
                                                <span className={`inline-block px-2 py-1 text-xs rounded-full ${getRoleColor(user?.role)}`}>
                                                    {user?.role}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="text-gray-700 hover:text-primary-600 transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="btn-primary w-fit"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
