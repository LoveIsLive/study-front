import { create } from 'zustand';

const useAIStore = create((set, get) => ({
    // 当前 AI 上下文配置
    context: {
        scene: 'common', // 实际发送给后端的 scene
        sceneParams: {},
    },

    // 新增：当前页面提供的可用场景（例如进入组织页变为 'organization'）
    availableScene: null,
    // 新增：用户是否开启了该场景（开关状态）
    isSceneActive: false,

    // 设置上下文的方法 (基础方法)
    setContext: (scene, params = {}) => {
        set((state) => ({
            context: { ...state.context, scene, sceneParams: params }
        }));
    },

    // 新增：页面注册可用场景
    registerScene: (sceneName) => {
        set({ availableScene: sceneName, isSceneActive: false });
        // 注册时，如果不强制开启，保持默认 scene 为 common
        set((state) => ({ context: { ...state.context, scene: 'common' } }));
    },

    // 新增：页面卸载时注销场景
    unregisterScene: () => {
        set({ availableScene: null, isSceneActive: false });
        // 复归为默认场景
        set((state) => ({ context: { ...state.context, scene: 'common' } }));
    },

    // 新增：切换场景开关
    toggleSceneActive: () => {
        const { availableScene, isSceneActive, context } = get();
        const newState = !isSceneActive;

        set({
            isSceneActive: newState,
            context: {
                ...context,
                // 如果开启，使用页面提供的场景；如果关闭，回归 common
                scene: newState && availableScene ? availableScene : 'common'
            }
        });
    }
}));

export default useAIStore;