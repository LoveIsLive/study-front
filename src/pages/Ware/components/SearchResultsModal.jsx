import React from 'react';
import Modal from '../../../components/common/Modal/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faFile } from '@fortawesome/free-solid-svg-icons';
import styles from '../WarePage.module.css';

const SearchResultsModal = ({ isOpen, onClose, results, status }) => {
    return (
        <Modal show={isOpen} onClose={onClose} title="搜索结果" size="large">
            <div className={styles.searchResultsList}>
                {results.map((item, index) => (
                    <div key={index} className={styles.searchResultItem}>
                        <FontAwesomeIcon icon={item.type === 0 ? faFolder : faFile} />
                        <div>
                            <strong>{item.name}</strong>
                            <div className={styles.searchResultPath}>{item.fullPath}</div>
                        </div>
                    </div>
                ))}
            </div>
            <p>{status}</p>
        </Modal>
    );
};

export default SearchResultsModal;