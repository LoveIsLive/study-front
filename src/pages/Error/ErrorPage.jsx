import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faHome } from '@fortawesome/free-solid-svg-icons';
import Illustration404 from './Illustration404';
import Illustration500 from './Illustration500';
import styles from './ErrorPage.module.css';

const errorData = {
    '404': {
        title: '404 - 找不到页面',
        description: "糟糕！您要找的页面似乎去星际旅行了，让我们帮您返回轨道吧。",
        illustration: <Illustration404 />
    },
    '500': {
        title: '500 - 服务器开小差了',
        description: "休斯顿，我们遇到了点麻烦... 我们的服务器正在打盹，工程师正在全力叫醒它！",
        illustration: <Illustration500 />
    },
    'unknown': {
        title: '发生未知错误',
        description: "发生了一些意料之外的事情。不是您的错，是我们的问题，我们正在调查。",
        illustration: <Illustration500 />
    }
};

const ErrorPage = ({ code: propCode }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();

    // 优先从prop获取code（用于 * 路由），其次从URL参数，最后从路由参数
    const queryParams = new URLSearchParams(location.search);
    const code = propCode || queryParams.get('code') || params.code || 'unknown';

    const data = errorData[code] || errorData['unknown'];

    useEffect(() => {
        document.body.style.backgroundColor = 'var(--bg-color)';
        return () => {
            document.body.style.backgroundColor = '#f0f2f5'; // 恢复默认
        };
    }, []);

    return (
        <div className={styles.errorPageContainer}>
            <div className={styles.errorContainer}>
                <div className={styles.illustrationContainer}>
                    {data.illustration}
                </div>

                <h1 className={styles.errorTitle}>{data.title}</h1>
                <p className={styles.errorDescription}>{data.description}</p>

                <div className={styles.errorActions}>
                    <button onClick={() => navigate(-1)} className={styles.actionBtn}>
                        <FontAwesomeIcon icon={faArrowLeft} /> 返回
                    </button>
                    <button onClick={() => navigate('/')} className={`${styles.actionBtn} ${styles.primary}`}>
                        <FontAwesomeIcon icon={faHome} /> 回到主页
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorPage;