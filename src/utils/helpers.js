// 注意：getRoles 和 getUserName 已被 zustand store 替代，不再需要。

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const sanitizeHTML = (str) => {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

export const buildNewPath = (currentPath, name) => {
    if (!currentPath || currentPath === '/') {
        if (name === '..') return '/';
        return "/" + name.replace(/^\//, ''); // 确保不会出现 //
    }
    if (name === '..') {
        const parts = currentPath.split('/').filter(p => p);
        parts.pop();
        return '/' + parts.join('/');
    }
    const basePath = currentPath.endsWith('/') ? currentPath : currentPath + '/';
    return basePath + name;
};

export const isPreviewable = (mimeTypeName) => {
    if (!mimeTypeName) return false;

    if (mimeTypeName.startsWith('image/') ||
        mimeTypeName.startsWith('text/') ||
        mimeTypeName.startsWith('audio/') ||
        mimeTypeName.startsWith('video/')) {
        return true;
    }

    return [
        'application/pdf',
        'application/json',
        'application/xml',
        'image/svg+xml'
    ].includes(mimeTypeName);
};

export const mimeIconMap = {
    // Documents
    'application/pdf': 'fas fa-file-pdf',
    'application/msword': 'fas fa-file-word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fas fa-file-word',
    'application/vnd.ms-excel': 'fas fa-file-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fas fa-file-excel',
    'application/vnd.ms-powerpoint': 'fas fa-file-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'fas fa-file-powerpoint',
    'text/plain': 'fas fa-file-alt',
    'text/csv': 'fas fa-file-csv',
    // Code
    'text/html': 'fas fa-file-code',
    'text/css': 'fas fa-file-code',
    'application/javascript': 'fas fa-file-code',
    'application/json': 'fas fa-file-code',
    'application/xml': 'fas fa-file-code',
    // Archives
    'application/zip': 'fas fa-file-archive',
    'application/vnd.rar': 'fas fa-file-archive',
    'application/x-7z-compressed': 'fas fa-file-archive',
    'application/x-tar': 'fas fa-file-archive',
    'application/gzip': 'fas fa-file-archive',
    // Fallback
    'application/octet-stream': 'fas fa-file-binary',
    'application/x-msdownload': 'fas fa-hdd',
};

// --- 这是被省略的完整 mimeTypes 对象 ---
const mimeTypes = {
    'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif',
    'bmp': 'image/bmp', 'webp': 'image/webp', 'svg': 'image/svg+xml', 'mp3': 'audio/mpeg',
    'wav': 'audio/wav', 'ogg': 'audio/ogg', 'm4a': 'audio/mp4', 'mp4': 'video/mp4',
    'webm': 'video/webm', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo', 'mkv': 'video/x-matroska',
    'pdf': 'application/pdf', 'txt': 'text/plain', 'rtf': 'application/rtf',
    'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'html': 'text/html', 'htm': 'text/html', 'css': 'text/css', 'js': 'application/javascript',
    'jsx': 'text/jsx', 'ts': 'application/typescript', 'tsx': 'text/tsx', 'json': 'application/json',
    'xml': 'application/xml', 'csv': 'text/csv', 'py': 'text/x-python', 'pyc': 'application/x-python-code',
    'java': 'text/x-java-source', 'class': 'application/java-vm', 'cpp': 'text/x-c++src',
    'cc': 'text/x-c++src', 'cxx': 'text/x-c++src', 'c': 'text/x-csrc', 'h': 'text/x-chdr',
    'hpp': 'text/x-c++hdr', 'cs': 'text/x-csharp', 'php': 'application/x-httpd-php', 'rb': 'text/x-ruby',
    'go': 'text/x-go', 'rs': 'text/rust', 'swift': 'text/x-swift', 'kt': 'text/x-kotlin',
    'scala': 'text/x-scala', 'pl': 'application/x-perl', 'sh': 'application/x-sh',
    'bash': 'application/x-sh', 'sql': 'application/sql', 'r': 'text/x-r-source',
    'matlab': 'text/x-matlab', 'm': 'text/x-matlab', 'mp': 'application/mp', 'lua': 'text/x-lua',
    'dart': 'application/dart', 'vue': 'text/vue', 'scss': 'text/x-scss', 'sass': 'text/x-sass',
    'less': 'text/x-less', 'coffee': 'text/coffeescript', 'zip': 'application/zip',
    'rar': 'application/vnd.rar', '7z': 'application/x-7z-compressed', 'tar': 'application/x-tar',
    'gz': 'application/gzip', 'tgz': 'application/gzip', 'bin': 'application/octet-stream',
    'exe': 'application/x-msdownload', 'dll': 'application/x-msdownload',
};

const mimeTypesValues = [...new Set(Object.values(mimeTypes))];

export function fileMimeTypeName(file) {
    const useType = mimeTypesValues.includes(file.type) ? file.type : 'application/octet-stream';
    if (!file.name || file.name.split('.').length < 2) {
        return useType;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    return mimeTypes[ext] || useType;
}

export const getFileIconClass = (fileName) => {
    if (!fileName) return 'fas fa-file';
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word',
        'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel', 'ppt': 'fa-file-powerpoint',
        'pptx': 'fa-file-powerpoint', 'zip': 'fa-file-archive', 'rar': 'fa-file-archive',
        'txt': 'fa-file-alt', 'jpg': 'fa-file-image', 'jpeg': 'fa-file-image',
        'png': 'fa-file-image', 'gif': 'fa-file-image', 'mp3': 'fa-file-audio', 'wav': 'fa-file-audio',
        'mp4': 'fa-file-video', 'mov': 'fa-file-video', 'avi': 'fa-file-video'
    };
    return `fas ${iconMap[extension] || 'fa-file'}`;
};