import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../services/api";
import toast from "react-hot-toast";

const AdminPanel = () => {
  const { user } = useAuth();

  // Simple course create state
  const [course, setCourse] = useState({ title: "", description: "", price: 0, thumbnailUrl: "" });
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [creating, setCreating] = useState(false);

  // File upload state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");

  // Attach uploaded file as lesson
  const [lessonInfo, setLessonInfo] = useState({
    courseId: "",
    title: "",
    orderIndex: 1,
  });

  // Fetch admin's created courses
  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const res = await api.get("/admin/courses");
      setCourses(res.data.items || []);
    } catch (err) {
      toast.error("Failed to load courses");
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Admin area</h1>
        <p className="mb-4">You must be an admin to access the panel.</p>
        <div className="space-x-2">
          <Link to="/login" className="btn-primary">
            Login
          </Link>
          <Link to="/register?role=admin" className="btn-secondary">
            Register as Admin
          </Link>
        </div>
      </div>
    );
  }

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post("/admin/courses", course);
      toast.success("Course created");
      // show created id so admin can use it when attaching lessons
      setCourse({ title: "", description: "", price: 0, thumbnailUrl: "" });
      setLessonInfo((s) => ({ ...s, courseId: res.data.id }));
      // reload list
      fetchCourses();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to create course");
    } finally {
      setCreating(false);
    }
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return toast.error("Select a file first");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const uploadRes = await api.post("/admin/lessons/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Uploaded");
      setUploadedUrl(uploadRes.data.url);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteCourse = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm("Delete this course? This is irreversible.")) return;
    try {
      await api.delete(`/admin/courses/${id}`);
      toast.success("Course deleted");
      fetchCourses();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to delete course");
    }
  };

  const deleteUpload = async (url) => {
    try {
      // extract filename
      const parts = url.split("/");
      const filename = parts[parts.length - 1];
      await api.delete(`/admin/uploads/${filename}`);
      toast.success("Uploaded file deleted");
      setUploadedUrl("");
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to delete upload");
    }
  };

  const handleAttachAsLesson = async (e) => {
    e.preventDefault();
    if (!lessonInfo.courseId) return toast.error("Provide course ID to attach lesson");
    if (!lessonInfo.title) return toast.error("Provide a lesson title");
    try {
      await api.post(`/admin/courses/${lessonInfo.courseId}/lessons`, {
        title: lessonInfo.title,
        description: "",
        fileUrl: uploadedUrl || null,
        videoUrl: null,
        duration: 0,
        orderIndex: lessonInfo.orderIndex,
      });
      toast.success("Lesson attached to course");
      setLessonInfo({ courseId: "", title: "", orderIndex: 1 });
      setUploadedUrl("");
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to attach lesson");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-3">Create Course</h2>
        <form onSubmit={handleCreateCourse} className="space-y-3">
          <input
            className="input-field"
            placeholder="Title"
            value={course.title}
            onChange={(e) => setCourse({ ...course, title: e.target.value })}
            required
          />
          <textarea
            className="input-field"
            placeholder="Short description"
            value={course.description}
            onChange={(e) => setCourse({ ...course, description: e.target.value })}
            required
          />
          <input
            className="input-field"
            placeholder="Thumbnail URL"
            value={course.thumbnailUrl || ""}
            onChange={(e) => setCourse({ ...course, thumbnailUrl: e.target.value })}
          />
          <input
            className="input-field"
            type="number"
            placeholder="Price"
            value={course.price || 0}
            onChange={(e) => setCourse({ ...course, price: parseFloat(e.target.value || 0) })}
          />
          <div className="flex justify-end">
            <button className="btn-primary" disabled={creating}>
              {creating ? "Creating..." : "Create Course"}
            </button>
          </div>
        </form>
      </div>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-3">Upload Video / Notes</h2>
        <input type="file" onChange={handleFileChange} />
        <div className="mt-3">
          <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {uploadedUrl && (
          <div className="mt-3 flex items-center space-x-3">
            <a href={uploadedUrl} target="_blank" rel="noreferrer" className="text-primary-600">
              View uploaded file
            </a>
            <button type="button" className="btn-danger" onClick={() => deleteUpload(uploadedUrl)}>
              Delete upload
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-3">Attach uploaded file as Lesson</h2>
        <form onSubmit={handleAttachAsLesson} className="space-y-3">
          <label className="block text-sm text-gray-700">Select course</label>
          <select
            className="input-field"
            value={lessonInfo.courseId}
            onChange={(e) => setLessonInfo({ ...lessonInfo, courseId: e.target.value })}
          >
            <option value="">-- Select a course --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.id})
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Lesson title"
            value={lessonInfo.title}
            onChange={(e) => setLessonInfo({ ...lessonInfo, title: e.target.value })}
          />
          <input
            className="input-field"
            type="number"
            placeholder="Order index"
            value={lessonInfo.orderIndex}
            onChange={(e) => setLessonInfo({ ...lessonInfo, orderIndex: parseInt(e.target.value || "1") })}
          />
          <div className="flex justify-end">
            <button className="btn-primary">Attach Lesson</button>
          </div>
        </form>
      </div>
      
      <div className="card mt-6">
        <h2 className="text-xl font-semibold mb-3">Your Courses</h2>
        {loadingCourses ? (
          <p>Loading...</p>
        ) : courses.length === 0 ? (
          <p>No courses yet</p>
        ) : (
          <div className="space-y-3">
            {courses.map((c) => (
              <div key={c.id} className="border p-3 rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-sm text-gray-600">{c.description}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm">${c.price || 'Free'}</div>
                  <button className="btn-secondary" onClick={() => navigator.clipboard && navigator.clipboard.writeText(c.id)}>
                    Copy ID
                  </button>
                  <button className="btn-danger" onClick={() => deleteCourse(c.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
