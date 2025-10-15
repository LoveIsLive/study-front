import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faCopy, faEye, faDownload, faInfoCircle, faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { formatFileSize, buildNewPath, isPreviewable, getFileIcon } from '../../../utils/helpers';
import useAuthStore from '../../../store/authStore';
import { wareApi } from '../../../services/api';
import styles from '../WarePage.module.css';
import Swal from 'sweetalert2';

const FileRow = ({ node, currentPath, onDoubleClick, refresh }) => {
    const { icon, className } = node.type === 0
        ? { icon: faFolder, className: 'folder-icon' }
        : getFileIcon(node.name);

    const { user } = useAuthStore();
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(node.name);

    const fullPath = buildNewPath(currentPath, node.name);

    const handleRename = async () => {
        if (newName && newName !== node.name) {
            try {
                if (node.type === 0) { // Directory
                    await wareApi.post('/update/dir', null, { params: { path: fullPath, newName } });
                } else { // File
                    await wareApi.post('/update/file', { path: fullPath, newName });
                }
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '重命名成功', showConfirmButton: false, timer: 2000 });
                refresh(currentPath);
            } catch (error) {
                Swal.fire({ icon: 'error', title: '重命名失败', text: error.response?.data?.message });
            }
        }
        setIsRenaming(false);
    };

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: `确定要删除 "${node.name}" 吗?`,
            text: node.type === 0 ? "警告：删除目录将永久删除其所有内容！" : "此操作无法撤销。",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: '取消',
            confirmButtonText: '是的，删除'
        });

        if (result.isConfirmed) {
            try {
                const url = node.type === 0 ? '/delete/dir' : '/delete/file';
                await wareApi.delete(url, { params: { path: fullPath } });
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `"${node.name}" 已删除`, showConfirmButton: false, timer: 2000 });
                refresh(currentPath);
            } catch (error) {
                Swal.fire({ icon: 'error', title: '删除失败' });
            }
        }
    };

    // other actions
    const handleAction = async (action) => {
        try {
            if (action === 'copy') {
                await navigator.clipboard.writeText(fullPath);
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '路径已复制', showConfirmButton: false, timer: 1500 });
            }
            if (action === 'details') {
                const response = await wareApi.get('/get/node', { params: { path: fullPath } });
                const details = response.data.data;
                Swal.fire({
                    title: `<strong>属性: ${details.name}</strong>`,
                    html: `<div style="text-align: left; margin-left: 2rem;">
                               <p><strong>类型:</strong> ${details.type === 0 ? '目录' : '文件'}</p>
                               <p><strong>大小:</strong> ${formatFileSize(details.size)}</p>
                               <p><strong>MIME类型:</strong> ${details.mimeTypeName || 'N/A'}</p>
                               <p><strong>路径:</strong> ${fullPath}</p>
                               <p><strong>创建时间:</strong> ${new Date(details.createTime).toLocaleString()}</p>
                               <p><strong>修改时间:</strong> ${new Date(details.modifyTime).toLocaleString()}</p>
                           </div>`,
                    showCloseButton: true,
                });
            }
            if (action === 'preview' || action === 'download') {
                const res = await wareApi.get('/get/downloadId', { params: { path: fullPath } });
                const token = res.data.data;
                const baseUrl = wareApi.defaults.baseURL;
                const url = `${baseUrl}/download?path=${encodeURIComponent(fullPath)}&token=${token}`;

                if (action === 'preview') {
                    window.open(`${url}&mode=inline`, '_blank');
                } else {
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', node.name);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: '操作失败' });
        }
    }


    return (
        <tr onDoubleClick={onDoubleClick}>
            <td className={styles.colIcon}>
                <FontAwesomeIcon icon={icon} className={`${styles.nodeIcon} ${className}`} />
            </td>
            <td className={styles.colName}>
                <div className={styles.nodeName}>
                    {isRenaming ? (
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            autoFocus
                            className={styles.renameInput}
                        />
                    ) : (
                        <span>{node.name}</span>
                    )}
                </div>
            </td>
            <td className={styles.colSize}>{node.type === 1 ? formatFileSize(node.size) : '--'}</td>
            <td className={styles.colModified}>{new Date(node.modifyTime).toLocaleString()}</td>
            <td className={styles.colActions}>
                <div className={styles.actionsContainer} onClick={(e) => e.stopPropagation()}>
                    <FontAwesomeIcon icon={faCopy} className={styles.actionIcon} title="复制路径" onClick={() => handleAction('copy')} />
                    {node.type === 1 && isPreviewable(node.mimeTypeName) && <FontAwesomeIcon icon={faEye} className={styles.actionIcon} title="预览" onClick={() => handleAction('preview')} />}
                    {node.type === 1 && <FontAwesomeIcon icon={faDownload} className={styles.actionIcon} title="下载" onClick={() => handleAction('download')} />}
                    <FontAwesomeIcon icon={faInfoCircle} className={styles.actionIcon} title="属性" onClick={() => handleAction('details')} />
                    {user.isTeacher && (
                        <>
                            <FontAwesomeIcon icon={faEdit} className={styles.actionIcon} title="重命名" onClick={() => setIsRenaming(true)} />
                            <FontAwesomeIcon icon={faTrashAlt} className={`${styles.actionIcon} ${styles.deleteIcon}`} title="删除" onClick={handleDelete} />
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
};

export default FileRow;