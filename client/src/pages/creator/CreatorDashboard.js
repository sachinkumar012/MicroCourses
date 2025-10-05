import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const CreatorDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Creator Dashboard</h1>
      <p className="mb-4">Welcome{user ? `, ${user.first_name}` : ''}! This is a placeholder dashboard for creators.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/creator/apply" className="card p-4">Apply to create courses</Link>
        <div className="card p-4">Manage your courses (placeholder)</div>
      </div>
    </div>
  );
};

export default CreatorDashboard;
