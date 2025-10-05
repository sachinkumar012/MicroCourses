import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const CreatorApply = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Creator Application</h1>
      <p className="mb-4">This is a simple placeholder for the creator application flow.</p>

      {user ? (
        <div>
          <p className="mb-2">Signed in as: {user.first_name} {user.last_name} ({user.email})</p>
          <p className="mb-4 text-sm text-gray-600">If you want to become a creator, submit your application here (placeholder).</p>
          <button className="btn-primary">Submit application (placeholder)</button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-4">Please <Link to="/login" className="text-primary-600">login</Link> to apply as a creator.</p>
        </div>
      )}
    </div>
  );
};

export default CreatorApply;
