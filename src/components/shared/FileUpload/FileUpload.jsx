import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons';
import { formatFileSize } from '../../../utils/helpers';
import styles from './FileUpload.module.css';

const FileUpload = ({ files, onFilesChange }) => {
    const fileInputRef = React.useRef(null);

    const handleFileSelect = (selectedFiles) => {
        const newFiles = Array.from(selectedFiles);
        onFilesChange([...files, ...newFiles]);
    };

    const handleDragEvents = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        handleDragEvents(e);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            handleFileSelect(droppedFiles);
        }
    };

    const removeFile = (indexToRemove) => {
        onFilesChange(files.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className={styles.uploadContainer}>
            <div
                className={styles.dragDropArea}
                onClick={() => fileInputRef.current.click()}
                onDragEnter={handleDragEvents}
                onDragOver={handleDragEvents}
                onDragLeave={handleDragEvents}
                onDrop={handleDrop}
            >
                <FontAwesomeIcon icon={faCloudUploadAlt} className={styles.uploadIcon} />
                <p>将文件拖拽到此处，或点击选择文件</p>
                <input
                    type="file"
                    multiple
                    hidden
                    ref={fileInputRef}
                    onChange={(e) => handleFileSelect(e.target.files)}
                />
            </div>

            {files.length > 0 && (
                <div className={styles.fileListPreview}>
                    {files.map((file, index) => (
                        <div key={index} className={styles.filePreviewItem}>
                            <span className={styles.fileName}>{file.name} ({formatFileSize(file.size)})</span>
                            <button
                                type="button"
                                className={styles.removeFileBtn}
                                onClick={() => removeFile(index)}
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUpload;