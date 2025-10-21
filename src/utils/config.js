export const config = {
    tokenName: 'authToken',
    LARGE_FILE_THRESHOLD: 10 * 1024 * 1024, // 10MB
    CHUNK_UPLOAD_CONCURRENCY: 4,

    // 后端常量配置
    back_base_url: '/api/v1',
    back_AUTH_PREFIX: '/auth',
    back_USER_PREFIX: '/user',
    back_INDEX_PREFIX: '/index',
    back_HOMEWORK_PREFIX: '/homework',
    back_SUBMISSION_PREFIX: '/submission',
    back_ATTACH_PREFIX: '/attach',
    back_WARE_PREFIX: '/ware/home',
    back_CLASS_PREFIX: '/classes',
    back_CLASSMEMBER_PREFIX: '/classmember',


    // 前端常量配置 (用于路由)
    front_AUTH_PREFIX: '/auth',
    front_HOME_PAGE_URL: "/"
};