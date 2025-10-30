import React, { useState } from 'react';
import styles from '../../HomeworkPage.module.css';
import discussionStyles from './Discussion.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTimes } from '@fortawesome/free-solid-svg-icons';

const DiscussionForm = ({
    onSubmit,
    onCancel,
    initialText = '',
    placeholder = "发表你的看法...",
    submitLabel = "发布",
    isSubmitting = false
}) => {
    const [content, setContent] = useState(initialText);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (content.trim()) {
            onSubmit(content);
            setContent('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className={discussionStyles.discussionForm}>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                disabled={isSubmitting}
                required
            />
            <div className={discussionStyles.formActions}>
                {onCancel && (
                    <button
                        type="button"
                        className={`${styles.btn} ${discussionStyles.cancelButton}`}
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        <FontAwesomeIcon icon={faTimes} /> 取消
                    </button>
                )}
                <button
                    type="submit"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={isSubmitting || !content.trim()}
                >
                    <FontAwesomeIcon icon={faPaperPlane} /> {isSubmitting ? '发布中...' : submitLabel}
                </button>
            </div>
        </form>
    );
};

export default DiscussionForm;