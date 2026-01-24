// src/hooks/useSceneAwareness.js
import { useEffect } from 'react';
import useAIStore from '../store/aiStore';

export const useSceneAwareness = (sceneName) => {
    const registerScene = useAIStore((state) => state.registerScene);
    const unregisterScene = useAIStore((state) => state.unregisterScene);

    useEffect(() => {
        if (sceneName) {
            registerScene(sceneName);
        }

        // 组件卸载时复归
        return () => {
            unregisterScene();
        };
    }, [sceneName, registerScene, unregisterScene]);
};