import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faPlus, faTrash, faEdit, faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import useAuthStore from '../../store/authStore';
import { createCourse, deleteCourse, getCoursesByClassId } from '../../services/courseService';
import styles from './CourseListPage.module.css';

const CourseListPage = () => {
  const navigate = useNavigate();
  const { activeId, activeType, currentCourseId, setCurrentCourse, courseList, fetchCourseList } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    coverImage: ''
  });

  // 确保当前上下文是班级
  useEffect(() => {
    if (activeType !== 'class') {
      Swal.fire({ icon: 'warning', title: '提示', text: '只有在班级上下文中才能管理课程。' });
      navigate('/');
    }
  }, [activeType, navigate]);

  // 加载课程列表
  useEffect(() => {
    if (activeType === 'class' && activeId) {
      loadCourses();
    }
  }, [activeId, activeType]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      await fetchCourseList();
    } catch (error) {
      console.error('加载课程列表失败:', error);
      Swal.fire({ icon: 'error', title: '加载失败', text: '无法加载课程列表，请稍后重试。' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.name.trim()) {
      Swal.fire({ icon: 'warning', title: '请输入课程名称' });
      return;
    }

    setCreating(true);
    try {
      await createCourse(newCourse);
      Swal.fire({ icon: 'success', title: '创建成功', text: '课程已创建。' });
      setShowCreateForm(false);
      setNewCourse({ name: '', description: '', coverImage: '' });
      await loadCourses();
    } catch (error) {
      console.error('创建课程失败:', error);
      Swal.fire({ icon: 'error', title: '创建失败', text: error.response?.data?.message || '未知错误' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    const result = await Swal.fire({
      icon: 'question',
      title: `确定删除课程 "${courseName}" 吗？`,
      text: '删除后课程将无法恢复，但关联资源会保留。',
      showCancelButton: true,
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });

    if (result.isConfirmed) {
      try {
        await deleteCourse(courseId);
        Swal.fire({ icon: 'success', title: '删除成功', text: '课程已删除。' });
        await loadCourses();
        // 如果删除的是当前选中的课程，清空选择
        if (currentCourseId === courseId) {
          useAuthStore.getState().clearCurrentCourse();
        }
      } catch (error) {
        console.error('删除课程失败:', error);
        Swal.fire({ icon: 'error', title: '删除失败', text: error.response?.data?.message || '未知错误' });
      }
    }
  };

  const handleSelectCourse = (course) => {
    setCurrentCourse(course.id, course);
    Swal.fire({ icon: 'success', title: '已选择课程', text: `已切换到课程 "${course.name}"` });
    navigate(`/ware/home/${course.id}`); // 导航到该课程的仓库
  };

  if (activeType !== 'class') {
    return null;
  }

  return (
    <div className={styles.courseListPage}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          <FontAwesomeIcon icon={faArrowLeft} /> 返回
        </button>
        <h1>课程管理</h1>
        <p>当前班级下的所有课程，您可以浏览、选择、创建或删除课程。</p>
      </header>

      <div className={styles.container}>
        <div className={styles.actions}>
          <button
            className={styles.createButton}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <FontAwesomeIcon icon={faPlus} /> {showCreateForm ? '取消创建' : '创建新课程'}
          </button>
          <button className={styles.refreshButton} onClick={loadCourses} disabled={loading}>
            <FontAwesomeIcon icon={faSpinner} spin={loading} /> 刷新列表
          </button>
        </div>

        {showCreateForm && (
          <div className={styles.createForm}>
            <h3>创建新课程</h3>
            <form onSubmit={handleCreateCourse}>
              <div className={styles.formGroup}>
                <label>课程名称 *</label>
                <input
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  placeholder="请输入课程名称"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>课程描述</label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  placeholder="请输入课程描述"
                  rows="3"
                />
              </div>
              <div className={styles.formGroup}>
                <label>封面图片URL（可选）</label>
                <input
                  type="text"
                  value={newCourse.coverImage}
                  onChange={(e) => setNewCourse({ ...newCourse, coverImage: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className={styles.formButtons}>
                <button type="submit" disabled={creating}>
                  {creating ? <FontAwesomeIcon icon={faSpinner} spin /> : '创建课程'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)}>
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            <p>加载课程列表中...</p>
          </div>
        ) : courseList.length === 0 ? (
          <div className={styles.emptyState}>
            <FontAwesomeIcon icon={faBookOpen} size="3x" />
            <h3>当前班级暂无课程</h3>
            <p>点击上方“创建新课程”按钮添加第一个课程。</p>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {courseList.map((course) => (
              <div
                key={course.id}
                className={`${styles.courseCard} ${currentCourseId === course.id ? styles.selected : ''}`}
              >
                {course.coverImage && (
                  <div className={styles.courseCover}>
                    <img src={course.coverImage} alt={course.name} />
                  </div>
                )}
                <div className={styles.courseInfo}>
                  <h3>{course.name}</h3>
                  <p className={styles.description}>{course.description || '暂无描述'}</p>
                  <div className={styles.meta}>
                    <span>教师: {course.teacherName || '未知'}</span>
                    <span>创建时间: {new Date(course.createTime).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className={styles.courseActions}>
                  <button
                    className={styles.selectButton}
                    onClick={() => handleSelectCourse(course)}
                  >
                    {currentCourseId === course.id ? '已选择' : '选择课程'}
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteCourse(course.id, course.name)}
                    title="删除课程"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <p>共 {courseList.length} 门课程</p>
        <p>当前选中课程: {currentCourseId ? courseList.find(c => c.id === currentCourseId)?.name : '无'}</p>
      </div>
    </div>
  );
};

export default CourseListPage;