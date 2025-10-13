import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTerminal, faSearch } from '@fortawesome/free-solid-svg-icons';
import styles from '../WarePage.module.css';

const WareHeader = ({ onNew, onSearch, onPathChange, isTeacher }) => {
    const [pathInput, setPathInput] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const handlePathKeyDown = (e) => {
        if (e.key === 'Enter') {
            onPathChange(pathInput);
            setPathInput('');
        }
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            onSearch(searchInput);
        }
    };

    return (
        <header className={styles.fileManagerHeader}>
            <div className={styles.headerLeft}>
                {isTeacher && (
                    <button onClick={onNew} className="btn btn-primary">
                        <FontAwesomeIcon icon={faPlus} /> 新建
                    </button>
                )}
            </div>
            <div className={styles.headerCenter}>
                <div className={styles.pathContainer}>
                    <FontAwesomeIcon icon={faTerminal} />
                    <input
                        type="text"
                        id="path-input"
                        placeholder="输入路径，按Enter跳转..."
                        value={pathInput}
                        onChange={(e) => setPathInput(e.target.value)}
                        onKeyDown={handlePathKeyDown}
                    />
                </div>
            </div>
            <div className={styles.headerRight}>
                <div className={styles.searchContainer}>
                    <FontAwesomeIcon icon={faSearch} />
                    <input
                        type="text"
                        id="search-input"
                        placeholder="实时搜索文件..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                    />
                </div>
            </div>
        </header>
    );
};

export default WareHeader;