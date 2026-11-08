import React from 'react';
import styles from './AutoQualityReviewSwitch.module.css';

const AutoQualityReviewSwitch = ({ checked, disabled, onChange }) => (
    <label className={styles.control}>
        <span>自动执行智能检查</span>
        <span className={styles.switch}>
            <input
                type="checkbox"
                role="switch"
                aria-label="自动执行智能检查"
                aria-checked={checked}
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span className={styles.track} aria-hidden="true" />
        </span>
    </label>
);

export default AutoQualityReviewSwitch;
