import { create } from 'zustand';

const useAIStore = create((set) => ({
    // 当前 AI 上下文
    context: {
        scene: 'common', // 默认场景
        sceneParams: {}, // 默认参数为空对象
    },

    // 设置上下文的方法
    setContext: (scene, params = {}) => {
        set({
            context: {
                scene,
                sceneParams: params
            }
        });
        console.log(`[AI Context Updated] Scene: ${scene}`, params);
    },

    // 重置上下文
    resetContext: () => {
        set({
            context: {
                scene: 'common',
                sceneParams: {}
            }
        });
    }
}));

export default useAIStore;