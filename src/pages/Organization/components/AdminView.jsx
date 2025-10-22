import React, { useState, useEffect, useCallback } from 'react';
import { classesApi } from '../../../services/api';
import Swal from 'sweetalert2';
import ClassCard from './ClassCard';
import ClassModal from './ClassModal';
import ClassDetailView from './ClassDetailView';
import Spinner from '../../../components/common/Spinner/Spinner';
import styles from '../OrganizationPage.module.css';
import adminStyles from './AdminView.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

const AdminView = () => {
    const [classes, setClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState({ name: 'list', data: null }); // 'list' | 'detail'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null); // null for new, object for edit

    const fetchClasses = useCallback(async () => {
        setIsLoading(true);
        try {
            // 获取包含成员数的详细班级列表
            const response = await classesApi.get('/all', { params: { detailed: true } });
            setClasses(response.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载班级列表失败' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (view.name === 'list') {
            fetchClasses();
        }
    }, [view.name, fetchClasses]);

    const handleSaveClass = async (classData) => {
        // classData 格式为 { name: '...' }
        try {
            if (editingClass) { // 更新模式
                await classesApi.put(`/${editingClass.id}`, classData);
                Swal.fire({ icon: 'success', title: '班级更新成功', timer: 1500, showConfirmButton: false });
            } else { // 创建模式
                await classesApi.post('/create', classData);
                Swal.fire({ icon: 'success', title: '班级创建成功', timer: 1500, showConfirmButton: false });
            }
            setIsModalOpen(false);
            fetchClasses(); // 刷新列表
        } catch (error) {
            Swal.fire({ icon: 'error', title: '保存失败', text: error.response?.data?.message || '服务器错误' });
        }
    };

    const handleDeleteClass = async (classId, className) => {
        const result = await Swal.fire({
            title: `确认删除班级 "${className}"?`,
            text: "班级下的所有成员关系将被解除，此操作无法恢复！",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: '确认删除',
            cancelButtonText: '取消',
        });
        if (result.isConfirmed) {
            try {
                await classesApi.delete(`/${classId}`);
                Swal.fire({ icon: 'success', title: '删除成功', timer: 1500, showConfirmButton: false });
                fetchClasses();
            } catch (error) {
                Swal.fire({ icon: 'error', title: '删除失败', text: error.response?.data?.message || '服务器错误' });
            }
        }
    };

    // 如果视图是详情页，渲染详情组件
    if (view.name === 'detail') {
        return (
            <ClassDetailView
                classId={view.data.id}
                className={view.data.name}
                onBack={() => setView({ name: 'list', data: null })}
            />
        );
    }

    // 默认渲染列表视图
    return (
        <div>
            <div className={adminStyles.toolbar}>
                <button
                    className="btn btn-primary"
                    onClick={() => { setEditingClass(null); setIsModalOpen(true); }}
                >
                    <FontAwesomeIcon icon={faPlus} /> 新建班级
                </button>
            </div>
            {isLoading ? <Spinner /> : (
                <div className={adminStyles.classListGrid}>
                    {classes.length > 0 ? (
                        classes.map(cls => (
                            <ClassCard
                                key={cls.id}
                                classInfo={cls}
                                isAdmin={true}
                                onSelect={() => setView({ name: 'detail', data: cls })}
                                onEdit={() => { setEditingClass(cls); setIsModalOpen(true); }}
                                onDelete={() => handleDeleteClass(cls.id, cls.name)}
                            />
                        ))
                    ) : (
                        <div className={styles.placeholder}>当前没有班级，请新建。</div>
                    )}
                </div>
            )}
            <ClassModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveClass}
                classData={editingClass}
            />
        </div>
    );
};

export default AdminView;