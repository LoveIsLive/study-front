import React, { useEffect, useState, useMemo } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim"; // 修正：从新的、带命名空间的包导入
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { indexApi } from '../../services/api';
import styles from './HomePage.module.css';

// 注册 GSAP 插件
gsap.registerPlugin(ScrollTrigger);

const HomePage = () => {
    // State 用于确保粒子引擎加载完毕后才渲染 Particles 组件
    const [init, setInit] = useState(false);
    // State 用于存储从后端获取的时间线数据
    const [timelineData, setTimelineData] = useState([]);

    // 这个 useEffect 负责引擎初始化，并且只运行一次
    useEffect(() => {
        initParticlesEngine(async (engine) => {
            // 加载 slim 预设包，其中包含了所有必需的组件
            await loadSlim(engine);
        }).then(() => {
            setInit(true); // 标记引擎已准备好
        });
    }, []); // 空依赖数组确保此 effect 只运行一次

    // 这个 useEffect 负责获取数据和设置页面样式
    useEffect(() => {
        // 进入此页面时，设置页面背景色为黑色
        document.body.style.backgroundColor = '#000000';

        // 定义获取时间线数据的函数
        const fetchTimelineData = async () => {
            try {
                const response = await indexApi.get('/timeline');
                setTimelineData(response.data.data);
            } catch (error) {
                console.error("Failed to fetch timeline data:", error);
            }
        };

        // 调用函数获取数据
        fetchTimelineData();

        // 返回一个清理函数，在组件卸载时执行
        return () => {
            // 离开此页面时，恢复默认的全局背景色
            document.body.style.backgroundColor = '#f0f2f5';
        };
    }, []); // 空依赖数组确保此 effect 只运行一次

    // 这个 useEffect 负责在数据加载后初始化 GSAP 滚动动画
    useEffect(() => {
        // 确保有数据后再执行，避免不必要的操作
        if (timelineData.length > 0) {
            const items = document.querySelectorAll(`.${styles.timelineItem}`);

            // 为每个时间线项目创建 ScrollTrigger 动画
            items.forEach(item => {
                gsap.to(item, {
                    scrollTrigger: {
                        trigger: item,
                        start: "top 80%", // 当元素顶部到达视口80%时触发
                        end: "bottom 20%",
                        toggleClass: styles.isVisible, // 添加/移除 CSS 类来控制动画
                        // markers: true, // 调试时可以开启，用于显示触发器位置
                    }
                });
            });

            // 返回一个清理函数，在组件卸载或数据变化时执行
            return () => {
                // 杀死所有由 GSAP 创建的 ScrollTrigger 实例，防止内存泄漏
                ScrollTrigger.getAll().forEach(trigger => trigger.kill());
            };
        }
    }, [timelineData]); // 依赖于 timelineData，当数据变化时会重新运行

    // 使用 useMemo 缓存粒子效果的配置对象，避免不必要的重渲染
    const particlesOptions = useMemo(() => ({
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
            "color": "#000000",
        }
    }), []);

    // 在引擎初始化完成前，不渲染任何内容，避免组件报错
    if (!init) {
        return null;
    }

    return (
        <div className={styles.homeContainer}>
            <Particles id="tsparticles" options={particlesOptions} />
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
        </div>
    );
};

export default HomePage;