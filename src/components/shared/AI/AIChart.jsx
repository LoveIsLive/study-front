// src/components/shared/AI/AIChart.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const AIChart = ({ option, title }) => {

    // 基础配置，确保图表在深色/浅色背景下都好看，并自适应
    const defaultOption = useMemo(() => {
        return {
            backgroundColor: 'rgba(255, 255, 255, 0.6)', // 半透明背景
            grid: { top: 40, right: 20, bottom: 30, left: 40, containLabel: true },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: '#ccc',
                textStyle: { color: '#333' }
            },
            ...option, // 合并后端返回的 option
        };
    }, [option]);

    return (
        <div style={{
            marginTop: '10px',
            marginBottom: '10px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            background: '#fff'
        }}>
            {title && (
                <div style={{
                    padding: '10px 15px',
                    borderBottom: '1px solid #eee',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#555',
                    background: 'rgba(240, 242, 245, 0.5)'
                }}>
                    📊 {title}
                </div>
            )}
            <ReactECharts
                option={defaultOption}
                style={{ height: '300px', width: '100%' }}
                opts={{ renderer: 'svg' }} // 使用 SVG 渲染更清晰
            />
        </div>
    );
};

export default AIChart;