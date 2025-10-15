// src/pages/Home/HomePage.jsx (最终优化版)

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { indexApi } from '../../services/api';
import styles from './HomePage.module.css';

gsap.registerPlugin(ScrollTrigger);

const HomePage = () => {
    // ... (所有 state 和 hooks 的定义保持不变)
    const [engineReady, setEngineReady] = useState(false);
    const [dataReady, setDataReady] = useState(false);
    const [isPageReady, setIsPageReady] = useState(false);
    const [timelineData, setTimelineData] = useState([]);
    const isMounted = useRef(true);

    // ... (所有 useEffect 和 useMemo 的逻辑保持不变)
    useEffect(() => {
        isMounted.current = true;
        document.body.style.backgroundColor = '#000000';
        const initPromises = [
            initParticlesEngine(async (engine) => { await loadSlim(engine); }).then(() => { if (isMounted.current) setEngineReady(true); }),
            indexApi.get('/timeline').then(response => {
                if (isMounted.current) {
                    setTimelineData(response.data.data);
                    setDataReady(true);
                }
            }).catch(error => {
                console.error("Failed to fetch timeline data:", error);
                if (isMounted.current) setDataReady(true);
            })
        ];
        Promise.all(initPromises).then(() => {
            setTimeout(() => {
                if (isMounted.current) setIsPageReady(true);
            }, 100);
        });
        return () => {
            isMounted.current = false;
            document.body.style.backgroundColor = '#f0f2f5';
        };
    }, []);

    useEffect(() => {
        if (timelineData.length > 0 && isPageReady) {
            const timeoutId = setTimeout(() => {
                const items = document.querySelectorAll(`.${styles.timelineItem}`);
                items.forEach(item => {
                    gsap.to(item, {
                        scrollTrigger: { trigger: item, start: "top 80%", end: "bottom 20%", toggleClass: styles.isVisible }
                    });
                });
                ScrollTrigger.refresh();
            }, 300);
            return () => {
                clearTimeout(timeoutId);
                ScrollTrigger.getAll().forEach(trigger => trigger.kill());
            };
        }
    }, [timelineData, isPageReady]);

    const particlesOptions = useMemo(() => ({
        // ... (粒子配置保持完全不变)
        "particles": {
            "number": { "value": 120, "density": { "enable": true, "value_area": 800 } },
            "color": { "value": "#ffffff" },
            "shape": { "type": "circle" },
            "opacity": { "value": 0.8, "random": true, "anim": { "enable": true, "speed": 1, "opacity_min": 0.1, "sync": false } },
            "size": { "value": 2, "random": true },
            "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.4, "width": 1 },
            "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out" }
        },
        "interactivity": {
            "events": {
                "onhover": { "enable": true, "mode": "grab" },
                "onclick": { "enable": true, "mode": "push" }
            },
            "modes": {
                "grab": { "distance": 140, "line_linked": { "opacity": 1 } },
                "push": { "particles_nb": 4 }
            }
        },
        "retina_detect": true,
        "background": {
            "color": "#000000", // 确保 Canvas 背景也是黑色
        }
    }), []);

    return (
        // --- 关键修改：调整 JSX 结构 ---
        <div className={styles.homeContainer}>

            {/* 加载遮罩现在位于 homeContainer 内部 */}
            <div className={`${styles.loadingOverlay} ${isPageReady ? styles.loadingHidden : ''}`}>
                <div className={styles.loadingSpinner}></div>
            </div>

            {/* 所有实际内容都被包裹在一个新的 contentWrapper 中 */}
            <div className={`${styles.contentWrapper} ${isPageReady ? styles.contentReady : ''}`}>
                {engineReady && <Particles id="tsparticles" options={particlesOptions} />}

                {dataReady && (
                    <div className={styles.timelineContainer}>
                        <div className={styles.timelinePath}>
                            <svg width="100%" height="100%" viewBox="0 0 1000 4000" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: 'rgb(0,255,255)', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: 'rgb(138,43,226)', stopOpacity: 1 }} />
                                    </linearGradient>
                                </defs>
                                <path d="M 500 0 C 500 200, 200 300, 500 500 S 800 700, 500 1000 S 200 1300, 500 1500 S 800 1700, 500 2000 S 200 2300, 500 2500 S 800 2700, 500 3000 S 200 3300, 500 3500 S 800 3700, 500 4000" fill="none" strokeWidth="4" stroke="url(#line-gradient)" />
                            </svg>
                        </div>
                        <div className={styles.timelineContent}>
                            {timelineData.map((item, index) => (
                                <div key={index} className={styles.timelineItem}>
                                    <div className={styles.timelineItemInner}>
                                        <h3>{item.title}</h3>
                                        <div className={styles.time}>{item.time}</div>
                                        <p>{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;