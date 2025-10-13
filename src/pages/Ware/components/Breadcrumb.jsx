import React from 'react';
import styles from '../WarePage.module.css';

const Breadcrumb = ({ currentPath, navigate }) => {
    const parts = currentPath.split('/').filter(p => p);

    const handleNavigate = (path) => {
        navigate(`/ware/home${path}`);
    };

    return (
        <div className={styles.breadcrumb}>
            <a onClick={() => handleNavigate('/')}>根目录</a>
            {parts.map((part, index) => {
                const path = '/' + parts.slice(0, index + 1).join('/');
                return (
                    <React.Fragment key={path}>
                        <span>&gt;</span>
                        <a onClick={() => handleNavigate(path)}>{part}</a>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Breadcrumb;