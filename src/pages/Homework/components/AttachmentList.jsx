import React from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faEye, faDownload } from '@fortawesome/free-solid-svg-icons';
import { formatFileSize, getFileIcon, isPreviewable } from '../../../utils/helpers';
import { attachApi } from '../../../services/api';
import styles from '../HomeworkPage.module.css';

const AttachmentList = ({ attachments }) => {
    if (!attachments || attachments.length === 0) {
        return <p style={{ color: '#888', fontSize: '0.9em' }}>无附件</p>;
    }

    const handleFileAction = async (path, fileName, action) => {
        try {
            const res = await attachApi.get('/download/get/downloadId', { params: { path, fileName } });
            const token = res.data.data;
            const baseUrl = attachApi.defaults.baseURL;

            if (action === 'preview') {
                const previewUrl = `${baseUrl}/download/download?mode=inline&path=${encodeURIComponent(path)}&token=${token}`;
                window.open(previewUrl, '_blank');
            } else if (action === 'download') {
                const downloadUrl = `${baseUrl}/download/download?path=${encodeURIComponent(path)}&token=${token}`;
                const tempLink = document.createElement('a');
                tempLink.style.display = 'none';
                tempLink.href = downloadUrl;
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: '获取文件链接失败' });
            console.error('File action failed:', error);
        }
    };

    return (
        <>
            <h4><FontAwesomeIcon icon={faPaperclip} /> 附件</h4>
            <ul className={styles.attachmentList}>
                {attachments.map(att => {
                    const { icon, className } = getFileIcon(att.fileName);
                    return (
                        <li key={att.filePath} className={styles.attachmentItem}>
                            <div className={styles.attachmentInfo}>
                                <FontAwesomeIcon
                                    icon={icon}
                                    className={className}
                                />
                                <span>{att.fileName} ({formatFileSize(att.fileSize)})</span>
                            </div>
                            <div className={styles.attachmentActions}>
                                {isPreviewable(att.mimeTypeName) &&
                                    <FontAwesomeIcon
                                        icon={faEye}
                                        className={styles.actionIcon}
                                        title="预览"
                                        onClick={() => handleFileAction(att.filePath, att.fileName, 'preview')}
                                    />}
                                <FontAwesomeIcon
                                    icon={faDownload}
                                    className={styles.actionIcon}
                                    title="下载"
                                    onClick={() => handleFileAction(att.filePath, att.fileName, 'download')}
                                />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </>
    );
};

export default AttachmentList;