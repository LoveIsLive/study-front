import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../../store/authStore';
import { classMemberApi } from '../../../services/api';
import Swal from 'sweetalert2';
import MemberTable from './MemberTable';
import AddMemberModal from './AddMemberModal';
import Spinner from '../../../components/common/Spinner/Spinner';
import styles from './ClassDetailView.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUserPlus } from '@fortawesome/free-solid-svg-icons';


const ClassDetailView = ({ classId, className, onBack }) => {
    const { user } = useAuthStore();
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- 修复点：增加 user.isPrincipal 判断 ---
    // 允许 Admin、校长、教师管理班级成员
    const canManageMembers = user && (user.isAdmin || user.isTeacher || user.isPrincipal);

    const fetchMembers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await classMemberApi.get(`/${classId}/all`);
            setMembers(response.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载成员列表失败' });
        } finally {
            setIsLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleAddMembers = async (memberData) => {
        try {
            await classMemberApi.post(`/${classId}/add`, memberData);
            Swal.fire({ icon: 'success', title: '添加成功', timer: 1500, showConfirmButton: false });
            setIsModalOpen(false);
            fetchMembers();
        } catch (error) {
            Swal.fire({ icon: 'error', title: '添加失败', text: error.response?.data?.message || '服务器错误' });
        }
    };

    const handleDeleteMembers = async (userIds) => {
        const result = await Swal.fire({
            title: `确认移除这 ${userIds.length} 位成员吗?`,
            text: "此操作无法撤销。",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: '确认移除',
            cancelButtonText: '取消',
        });
        if (result.isConfirmed) {
            try {
                // 后端 DTO 需要的是 userIds
                await classMemberApi.delete(`/${classId}/remove`, { data: { userIds } });
                Swal.fire({ icon: 'success', title: '移除成功', timer: 1500, showConfirmButton: false });
                fetchMembers();
            } catch (error) {
                Swal.fire({ icon: 'error', title: '移除失败', text: error.response?.data?.message || '服务器错误' });
            }
        }
    };

    const teachers = members.filter(m => m.role === 'ROLE_TEACHER');
    const students = members.filter(m => m.role === 'ROLE_STUDENT');

    return (
        <div className={styles.detailContainer}>
            <div className={styles.header}>
                {/* 如果 onBack 存在 (管理员/校长视图)，则显示返回按钮 */}
                {onBack && (
                    <button onClick={onBack} className="btn btn-primary">
                        <FontAwesomeIcon icon={faArrowLeft} /> 返回班级列表
                    </button>
                )}
                {/* 只要有权限，就显示添加按钮 */}
                {canManageMembers && (
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <FontAwesomeIcon icon={faUserPlus} /> 添加成员
                    </button>
                )}
            </div>

            <div className={styles.memberSection}>
                <div className={styles.sectionHeader}>
                    <h3>教师 ({teachers.length})</h3>
                </div>
                {isLoading ? <Spinner /> : <MemberTable members={teachers} canDelete={canManageMembers} onDelete={handleDeleteMembers} />}
            </div>

            <div className={styles.memberSection}>
                <div className={styles.sectionHeader}>
                    <h3>学生 ({students.length})</h3>
                </div>
                {isLoading ? <Spinner /> : <MemberTable members={students} canDelete={canManageMembers} onDelete={handleDeleteMembers} />}
            </div>

            {canManageMembers && (
                <AddMemberModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onAdd={handleAddMembers}
                />
            )}
        </div>
    );
};

export default ClassDetailView;