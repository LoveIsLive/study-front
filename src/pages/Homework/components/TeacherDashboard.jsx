import React, { useState, useEffect, useCallback } from 'react';
import { homeworkApi } from '../../../services/api';
import HomeworkList from './HomeworkList';
import SubmissionList from './SubmissionList';
import Spinner from '../../../components/common/Spinner/Spinner';
import withReactContent from 'sweetalert2-react-content';
import Swal from 'sweetalert2';

const MySwal = withReactContent(Swal);

// 接收 onEditHomework 和 refreshTrigger props
const TeacherDashboard = ({ view, navigateTo, onEditHomework, refreshTrigger }) => {
    const [homeworks, setHomeworks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- fetchHomeworks 现在使用 useCallback ---
    const fetchHomeworks = useCallback(async () => {
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
    }, []); // 依赖项为空

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
                fetchHomeworks(); // 删除成功后刷新列表
            } catch (error) {
                MySwal.fire({ icon: 'error', title: '删除失败' });
            }
        }
    };

    // useEffect 现在依赖于 fetchHomeworks 和 refreshTrigger
    useEffect(() => {
        if (view.name === 'list') {
            fetchHomeworks();
        }
    }, [view.name, fetchHomeworks, refreshTrigger]);

    if (isLoading && view.name === 'list') {
        return <Spinner />;
    }

    if (view.name === 'submissionList') {
        return <SubmissionList homeworkId={view.data} onBack={() => navigateTo('list')} />;
    }

    return (
        <div>
            {/* 将 onEditHomework 传递给 HomeworkList */}
            <HomeworkList
                homeworks={homeworks}
                onViewSubmissions={(homeworkId) => navigateTo('submissionList', homeworkId)}
                onDeleteHomework={handleDeleteHomework}
                onEditHomework={onEditHomework} // <-- 传递 prop
                isTeacher={true}
            />
        </div>
    );
};

export default TeacherDashboard;