import React, { useEffect } from 'react';
import styles from './Modal.module.css';

const Modal = ({ show, onClose, title, children, size = 'medium' }) => {
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!show) {
        return null;
    }

    const sizeClass = size === 'large' ? styles.large : '';

    return (
        <div className={styles.modal} onClick={onClose}>
            <div
                className={`${styles.modalContent} ${sizeClass}`}
                onClick={(e) => e.stopPropagation()}
            >
                <span className={styles.closeBtn} onClick={onClose}>&times;</span>
                <h2>{title}</h2>
                {children}
            </div>
        </div>
    );
};

export default Modal;