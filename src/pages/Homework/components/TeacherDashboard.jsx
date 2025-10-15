import React, { useState, useEffect } from 'react';
import { homeworkApi } from '../../../services/api';
import HomeworkList from './HomeworkList';
import SubmissionList from './SubmissionList';
import Spinner from '../../../components/common/Spinner/Spinner';
import withReactContent from 'sweetalert2-react-content';
import Swal from 'sweetalert2';

const MySwal = withReactContent(Swal);

// 接收新的 prop: refreshTrigger
const TeacherDashboard = ({ view, navigateTo, refreshTrigger }) => {
    const [homeworks, setHomeworks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHomeworks = async () => {
        setIsLoading(true);
        try {
            const response = await homeworkApi.get('/teacher/all');
            setHomeworks(response.data.data || []);
        } catch (error) {
            console.error("Failed to fetch homeworks:", error);
            MySwal.fire({ icon: 'error', title: '加载作业失败' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteHomework = async (homeworkId, homeworkTitle) => {
        const result = await MySwal.fire({
            title: `确认删除作业 "${homeworkTitle}"?`,
            text: "此操作将一并删除所有学生的提交记录，且无法恢复！",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: '取消',
            confirmButtonText: '确认删除'
        });

        if (result.isConfirmed) {
            try {
                await homeworkApi.delete(`/${homeworkId}`);
                MySwal.fire({ icon: 'success', title: '作业已删除', timer: 1500, showConfirmButton: false });
                fetchHomeworks(); // 直接调用 fetch 重新加载列表
            } catch (error) {
                MySwal.fire({ icon: 'error', title: '删除失败' });
            }
        }
    };

    // useEffect 现在依赖于 view 和 refreshTrigger
    useEffect(() => {
        // 仅当视图是列表时才获取作业
        if (view.name === 'list') {
            fetchHomeworks();
        }
    }, [view, refreshTrigger]); // 当 view 或 refreshTrigger 变化时，重新运行

    if (isLoading) {
        return <Spinner />;
    }

    if (view.name === 'submissionList') {
        return <SubmissionList homeworkId={view.data} onBack={() => navigateTo('list')} />;
    }

    return (
        <div>
            {/* 按钮和模态框已移至父组件 */}
            <HomeworkList
                homeworks={homeworks}
                onViewSubmissions={(homeworkId) => navigateTo('submissionList', homeworkId)}
                onDeleteHomework={handleDeleteHomework}
                isTeacher={true}
            />
        </div>
    );
};

export default TeacherDashboard;