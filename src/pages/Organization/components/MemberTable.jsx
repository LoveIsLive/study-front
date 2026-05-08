import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2'; // 导入 Swal
import styles from './MemberTable.module.css';

const MemberTable = ({
  members,
  canDelete = false,
  onDelete,
  onModifyCourses,
}) => {
    const [selected, setSelected] = useState([]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelected(members.map(m => m.userId));
        } else {
            setSelected([]);
        }
    };

    const handleSelectOne = (userId) => {
        if (selected.includes(userId)) {
            setSelected(prev => prev.filter(id => id !== userId));
        } else {
            setSelected(prev => [...prev, userId]);
        }
    };

    const isAllSelected = useMemo(() => members.length > 0 && selected.length === members.length, [selected, members]);

    // --- 关键修正：重构删除处理函数 ---
    const handleDeleteClick = async () => {
        if (selected.length === 0 || !onDelete) return;

        // 1. 从完整的 members 列表中，根据 selected 的 userIds 找出对应的成员对象
        const membersToDelete = members.filter(m => selected.includes(m.userId));

        // 2. 提取这些成员的名字
        const memberNames = membersToDelete.map(m => m.user?.username || '未知用户');

        // 3. 创建一个美观的 HTML 列表用于在 Swal 中显示
        const memberListHtml = `
            <ul class="${styles.swalUserList}">
                ${memberNames.map(name => `<li>${name}</li>`).join('')}
            </ul>
        `;

        // 4. 使用自定义 HTML 内容来调用 Swal
        const result = await Swal.fire({
            title: `确认移除以下 ${selected.length} 位成员吗?`,
            html: memberListHtml, // 将成员列表放入模态框
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: '确认移除',
            cancelButtonText: '取消',
            // 自定义 Swal 的 class 以便应用样式
            customClass: {
                popup: styles.swalPopup,
            }
        });

        if (result.isConfirmed) {
            // 调用父组件传递的 onDelete 函数
            onDelete(selected);
            // 注意：不再在这里清空 selected 状态
            // setSelected([]); 
        }
    };

    if (members.length === 0) {
        return <div className={styles.emptyState}>此列表无成员</div>;
    }

    return (
        <div>
            {canDelete && (
                <div className={styles.toolbar}>
                    <button
                        className="btn btn-danger"
                        disabled={selected.length === 0}
                        onClick={handleDeleteClick}
                    >
                        <FontAwesomeIcon icon={faTrashAlt} /> 移除选中成员
                    </button>
                </div>
            )}
            <table className={styles.table}>
                <thead>
                    <tr>
                        {canDelete && (
                            <th className={styles.checkboxCol}>
                                <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} />
                            </th>
                        )}
                        <th>用户名</th>
                        <th>加入时间</th>
                        {/* 【新增】如果有 onModifyCourses，则添加操作列头 */}
                        {onModifyCourses && <th>操作</th>}
                    </tr>
                </thead>
                <tbody>
                    {members.map(member => (
                        <tr key={member.id}>
                            {canDelete && (
                                <td className={styles.checkboxCol}>
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(member.userId)}
                                        onChange={() => handleSelectOne(member.userId)}
                                    />
                                </td>
                            )}
                            <td>{member.user?.username || '未知用户'}</td>
                            <td>{new Date(member.joinTime).toLocaleString()}</td>

                            {/* 【新增】操作按钮 */}
                            {onModifyCourses && (
                                <td>
                                    <button
                                        className="btn btn-sm btn-info"
                                        onClick={() => onModifyCourses(member)}
                                        style={{ padding: "4px 8px", fontSize: "12px" }}
                                    >
                                        修改可见课程
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MemberTable;