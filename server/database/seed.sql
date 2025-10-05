-- Seed data for MicroCourses

-- Insert test users
INSERT INTO users (id, email, password_hash, first_name, last_name, role, creator_status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@microcourses.com', '$2a$10$rQZ8K9mP5xV2nL3sT4uF6eK7jH8iG9kL0mN1oP2qR3sT4uV5wX6yZ7aB8cD9eF0', 'Admin', 'User', 'admin', 'approved'),
('550e8400-e29b-41d4-a716-446655440002', 'creator@microcourses.com', '$2a$10$rQZ8K9mP5xV2nL3sT4uF6eK7jH8iG9kL0mN1oP2qR3sT4uV5wX6yZ7aB8cD9eF0', 'John', 'Creator', 'creator', 'approved'),
('550e8400-e29b-41d4-a716-446655440003', 'learner@microcourses.com', '$2a$10$rQZ8K9mP5xV2nL3sT4uF6eK7jH8iG9kL0mN1oP2qR3sT4uV5wX6yZ7aB8cD9eF0', 'Jane', 'Learner', 'learner', 'pending');

-- Additional tester accounts requested by the user
INSERT INTO users (id, email, password_hash, first_name, last_name, role, creator_status) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'admin@mail.com', '$2a$10$tau3UU30CvW8ffcqrNTNpeUwH0YTuLKBh97C6xv6HAghhsHElDj62', 'Admin', 'Tester', 'admin', 'approved'),
('550e8400-e29b-41d4-a716-446655440011', 'tester@mail.com', '$2a$10$tau3UU30CvW8ffcqrNTNpeUwH0YTuLKBh97C6xv6HAghhsHElDj62', 'Test', 'Creator', 'creator', 'approved');

-- Insert creator application
INSERT INTO creator_applications (user_id, bio, expertise, portfolio_url, status) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'Experienced software developer with 10+ years in web development', 'JavaScript, React, Node.js, Python, Machine Learning', 'https://github.com/johncreator', 'approved');

-- Creator application for tester@mail.com
INSERT INTO creator_applications (user_id, bio, expertise, portfolio_url, status) VALUES
('550e8400-e29b-41d4-a716-446655440011', 'Test creator for QA purposes', 'Testing, QA, Demo', 'https://example.com/tester', 'approved');

-- Insert sample courses
INSERT INTO courses (id, creator_id, title, description, price, status, published_at) VALUES
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Complete React Course', 'Learn React from basics to advanced concepts with hands-on projects', 99.99, 'published', CURRENT_TIMESTAMP),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Node.js Masterclass', 'Master server-side JavaScript with Node.js and Express', 149.99, 'published', CURRENT_TIMESTAMP),
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Python for Data Science', 'Learn Python programming for data analysis and machine learning', 199.99, 'draft', NULL);

-- Insert lessons for Complete React Course
INSERT INTO lessons (course_id, title, description, duration, order_index, transcript) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Introduction to React', 'Learn what React is and why it is popular', 1800, 1, 'Welcome to this comprehensive React course. In this lesson, we will cover the fundamentals of React including components, JSX, and the virtual DOM.'),
('650e8400-e29b-41d4-a716-446655440001', 'Components and Props', 'Understanding React components and how to pass data with props', 2400, 2, 'In this lesson, we dive deep into React components. You will learn how to create functional and class components, and how to pass data between components using props.'),
('650e8400-e29b-41d4-a716-446655440001', 'State and Lifecycle', 'Managing component state and understanding lifecycle methods', 3000, 3, 'State management is crucial in React applications. This lesson covers useState and useEffect hooks, as well as class component lifecycle methods.'),
('650e8400-e29b-41d4-a716-446655440001', 'Handling Events', 'Event handling in React applications', 1800, 4, 'Learn how to handle user interactions in React. We cover event handling, synthetic events, and best practices for event management.'),
('650e8400-e29b-41d4-a716-446655440001', 'Conditional Rendering', 'Conditional rendering and dynamic content display', 2100, 5, 'Master conditional rendering techniques in React. Learn when and how to show different content based on application state.');

-- Insert lessons for Node.js Masterclass
INSERT INTO lessons (course_id, title, description, duration, order_index, transcript) VALUES
('650e8400-e29b-41d4-a716-446655440002', 'Introduction to Node.js', 'Understanding Node.js and its ecosystem', 1800, 1, 'Welcome to Node.js! In this lesson, we explore what Node.js is, its benefits, and how it differs from traditional server-side technologies.'),
('650e8400-e29b-41d4-a716-446655440002', 'Modules and NPM', 'Working with Node.js modules and package management', 2400, 2, 'Learn about Node.js module system, how to create and use modules, and manage dependencies with npm.'),
('650e8400-e29b-41d4-a716-446655440002', 'Express Framework', 'Building web applications with Express.js', 3600, 3, 'Express.js is the most popular web framework for Node.js. Learn how to create RESTful APIs and web applications with Express.'),
('650e8400-e29b-41d4-a716-446655440002', 'Database Integration', 'Connecting to databases with Node.js', 3000, 4, 'Database integration is essential for most applications. Learn how to connect to PostgreSQL, MongoDB, and other databases.'),
('650e8400-e29b-41d4-a716-446655440002', 'Authentication and Security', 'Implementing secure authentication in Node.js', 2700, 5, 'Security is paramount in web applications. Learn about JWT authentication, password hashing, and security best practices.');

-- Insert enrollment for learner
INSERT INTO enrollments (user_id, course_id) VALUES
('550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440001');

-- Insert lesson progress (learner has completed first 3 lessons of React course)
INSERT INTO lesson_progress (user_id, lesson_id, progress_percentage) VALUES
('550e8400-e29b-41d4-a716-446655440003', (SELECT id FROM lessons WHERE course_id = '650e8400-e29b-41d4-a716-446655440001' AND order_index = 1), 100),
('550e8400-e29b-41d4-a716-446655440003', (SELECT id FROM lessons WHERE course_id = '650e8400-e29b-41d4-a716-446655440001' AND order_index = 2), 100),
('550e8400-e29b-41d4-a716-446655440003', (SELECT id FROM lessons WHERE course_id = '650e8400-e29b-41d4-a716-446655440001' AND order_index = 3), 100),
('550e8400-e29b-41d4-a716-446655440003', (SELECT id FROM lessons WHERE course_id = '650e8400-e29b-41d4-a716-446655440001' AND order_index = 4), 75),
('550e8400-e29b-41d4-a716-446655440003', (SELECT id FROM lessons WHERE course_id = '650e8400-e29b-41d4-a716-446655440001' AND order_index = 5), 0);
