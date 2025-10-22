import { useState, useCallback } from 'react';

// 定义一个异步函数来处理复制逻辑，包含降级方案
async function copyTextToClipboard(text) {
    // 优先使用 navigator.clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true; // 表示成功
        } catch (err) {
            console.error('使用 navigator.clipboard 复制失败: ', err);
            return false; // 表示失败
        }
    } else {
        // 降级方案：使用 document.execCommand('copy')
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // 避免在屏幕上闪烁
        textArea.style.position = "fixed";
        textArea.style.top = "-9999px";
        textArea.style.left = "-9999px";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            // 执行复制命令
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful; // 返回执行结果
        } catch (err) {
            console.error('使用 execCommand 复制失败', err);
            document.body.removeChild(textArea);
            return false; // 表示失败
        }
    }
}


export const useCopyToClipboard = () => {
    const [copied, setCopied] = useState(false);

    const copy = useCallback(async (text) => {
        const success = await copyTextToClipboard(text);
        setCopied(success);
        // 重置状态，以便用户可以再次看到成功提示
        if (success) {
            setTimeout(() => setCopied(false), 2000); // 2秒后重置
        }
        return success;
    }, []);

    return [copied, copy];
};