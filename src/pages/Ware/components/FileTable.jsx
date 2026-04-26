import React from 'react';
import { useNavigate } from 'react-router-dom';
import FileRow from './FileRow';
import styles from '../WarePage.module.css';

const FileTable = ({ nodes, currentPath, refresh, onNavigate }) => {
    const navigate = useNavigate();

    const handleRowDoubleClick = (node) => {
        if (node.type === 0) { // 0 for directory
            const newPath = `${currentPath === '/' ? '' : currentPath}/${node.name}`;
            if (onNavigate) {
                onNavigate(newPath);
            } else {
                navigate(`/ware/home${newPath}`);
            }
        }
    };

    return (
        <table className={styles.fileTable}>
            <thead>
                <tr>
                    <th className={styles.colIcon}></th>
                    <th className={styles.colName}>名称</th>
                    <th className={styles.colSize}>大小</th>
                    <th className={styles.colModified}>修改日期</th>
                    <th className={styles.colActions}>操作</th>
                </tr>
            </thead>
            <tbody>
                {nodes.length === 0 ? (
                    <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                            此目录为空
                        </td>
                    </tr>
                ) : (
                    nodes.map(node => (
                        <FileRow
                            key={node.name}
                            node={node}
                            currentPath={currentPath}
                            onDoubleClick={() => handleRowDoubleClick(node)}
                            refresh={refresh}
                        />
                    ))
                )}
            </tbody>
        </table>
    );
};

export default FileTable;