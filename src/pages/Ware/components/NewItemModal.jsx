import React, { useState } from 'react';
import { wareApi } from '../../../services/api';
import { uploadFiles } from '../../../services/uploadService';
import { buildNewPath } from '../../../utils/helpers';
import Modal from '../../../components/common/Modal/Modal';
import FileUpload from '../../../components/shared/FileUpload/FileUpload';
import styles from '../WarePage.module.css';
import Swal from 'sweetalert2';

const NewItemModal = ({ isOpen, onClose, currentPath, onSuccess }) => {
    const [view, setView] = useState('options'); // 'options', 'dir', 'upload'
    const [dirName, setDirName] = useState('');
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleClose = () => {
        setView('options');
        setDirName('');
        setFiles([]);
        setIsProcessing(false);
        onClose();
    };

    const handleCreateDir = async (e) => {
        e.preventDefault();
        if (!dirName.trim()) return;
        setIsProcessing(true);
        try {
            const path = buildNewPath(currentPath, dirName);
            await wareApi.post('/create/directories', null, { params: { path } });
            Swal.fire({ icon: 'success', title: '目录创建成功' });
            onSuccess();
            handleClose();
        } catch (error) {
            Swal.fire({ icon: 'error', title: '创建失败', text: error.response?.data?.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUploadFiles = async (e) => {
        e.preventDefault();
        if (files.length === 0) {
            Swal.fire({ icon: 'info', title: '请选择文件' });
            return;
        }
        setIsProcessing(true);
        try {
            // 这里我们只处理小文件直传，大文件上传逻辑与homework模块类似，可以复用uploadService
            const uploadPromises = files.map(file => {
                const formData = new FormData();
                const destPath = buildNewPath(currentPath, file.name);
                formData.append('path', destPath);
                formData.append('file', file);
                formData.append('mimeTypeName', file.type);
                return wareApi.post('/create/files', formData);
            });

            await Promise.all(uploadPromises);

            Swal.fire({ icon: 'success', title: '文件上传成功' });
            onSuccess();
            handleClose();
        } catch (error) {
            Swal.fire({ icon: 'error', title: '上传失败' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal show={isOpen} onClose={handleClose} title="新建">
            {view === 'options' && (
                <div className={styles.newItemOptions}>
                    <button className="btn" onClick={() => setView('dir')}><i className="fas fa-folder-plus"></i> 新建目录</button>
                    <button className="btn" onClick={() => setView('upload')}><i className="fas fa-file-upload"></i> 上传文件</button>
                </div>
            )}
            {view === 'dir' && (
                <form onSubmit={handleCreateDir}>
                    <h3>新建目录</h3>
                    <input
                        type="text"
                        placeholder="目录名称"
                        value={dirName}
                        onChange={(e) => setDirName(e.target.value)}
                        required
                        autoFocus
                    />
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                            {isProcessing ? '创建中...' : '创建'}
                        </button>
                    </div>
                </form>
            )}
            {view === 'upload' && (
                <form onSubmit={handleUploadFiles}>
                    <h3>上传文件</h3>
                    <FileUpload files={files} onFilesChange={setFiles} />
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                            {isProcessing ? '上传中...' : '立即上传'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default NewItemModal;