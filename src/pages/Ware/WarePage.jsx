import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import useAuthStore from '../../store/authStore';
import { wareApi } from '../../services/api';
import { config } from '../../utils/config';
import { buildNewPath } from '../../utils/helpers';
import Breadcrumb from './components/Breadcrumb';
import FileTable from './components/FileTable';
import WareHeader from './components/WareHeader';
import NewItemModal from './components/NewItemModal';
import SearchResultsModal from './components/SearchResultsModal';
import Spinner from '../../components/common/Spinner/Spinner';
import styles from './WarePage.module.css';
import Swal from 'sweetalert2';

const WarePage = () => {
    const { token, user, currentCourseId } = useAuthStore();
    const isAdmin = useAuthStore((state) => state.isAdmin());
    const isTeacher = useAuthStore((state) => state.isTeacher());
    const isPrincipal = useAuthStore((state) => state.isPrincipal());

    const [nodes, setNodes] = useState([]);
    const [currentPath, setCurrentPath] = useState('/');
    const [isLoading, setIsLoading] = useState(true);

    const [isNewItemModalOpen, setNewItemModalOpen] = useState(false);
    const [isSearchModalOpen, setSearchModalOpen] = useState(false);

    const [searchResults, setSearchResults] = useState([]);
    const [searchStatus, setSearchStatus] = useState('');

    const location = useLocation();
    const navigate = useNavigate();
    const stompClientRef = useRef(null);

    const fetchNodes = useCallback(async (path) => {
        setIsLoading(true);
        try {
            if (!currentCourseId) {
                // 没有选择课程，重定向到根目录或显示提示
                Swal.fire({ icon: 'warning', title: '请先选择课程', text: '您需要先选择一个课程才能访问课程仓库' });
                navigate('/');
                return;
            }
            
            // 路径参数使用相对路径（如 '/' 或 '/folder1'），apiClient 拦截器会自动添加课程ID前缀
            const response = await wareApi.get('/get/dir', { params: { path } });
            setNodes(response.data.data.fileObjectDescs || []);
            setCurrentPath(path);
        } catch (error) {
            console.error('Failed to fetch nodes:', error);
            Swal.fire({ icon: 'error', title: '加载失败', text: error.response?.data?.message || '可能路径不存在或无权限' });
            navigate(`/ware/home/${currentCourseId || ''}`);
        } finally {
            setIsLoading(false);
        }
    }, [navigate, currentCourseId]);

    // --- 关键修正部分 ---
    useEffect(() => {
        // 解析URL路径，格式：/ware/home/{courseId}/{path?}
        // 移除所有可能的 /ware/home 前缀，防止重复拼接
        const pathWithoutPrefix = location.pathname.replace(/\/ware\/home/g, '') || '/';
        console.log('[useEffect] location.pathname:', location.pathname, 'pathWithoutPrefix:', pathWithoutPrefix, 'currentCourseId:', currentCourseId);
        
        try {
            let decodedPath = decodeURIComponent(pathWithoutPrefix);
            console.log('[useEffect] decodedPath:', decodedPath);
            
            // 验证课程ID
            if (!currentCourseId) {
                // 没有选择课程，重定向到首页
                Swal.fire({ icon: 'warning', title: '请先选择课程', text: '您需要先选择一个课程才能访问课程仓库' });
                navigate('/');
                return;
            }
            
            const courseIdStr = String(currentCourseId);
            // 如果路径以课程ID开头，移除课程ID部分，只保留子路径
            if (decodedPath.startsWith(`/${courseIdStr}/`) || decodedPath === `/${courseIdStr}`) {
                decodedPath = decodedPath.replace(`/${courseIdStr}`, '') || '/';
                console.log('[useEffect] after removing courseId, decodedPath:', decodedPath);
            } else if (decodedPath !== '/') {
                // 路径不以当前课程ID开头，但也不是根目录，可能URL中的课程ID不匹配
                // 重定向到正确的课程仓库根目录
                console.log('[useEffect] path does not start with current courseId, redirecting to root');
                navigate(`/ware/home/${currentCourseId}`);
                return;
            }
            
            // 使用解码后的路径获取数据（路径中不包含课程ID）
            console.log('[useEffect] calling fetchNodes with:', decodedPath);
            fetchNodes(decodedPath);
        } catch (e) {
            console.error("Failed to decode URI component:", pathWithoutPrefix, e);
            // 如果解码失败（例如URL格式错误），则导航到课程仓库根目录
            navigate(`/ware/home/${currentCourseId || ''}`);
        }

    }, [location.pathname, fetchNodes, navigate, currentCourseId]);

    // WebSocket connection (使用Vite代理方案)
    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS('/ws/search'),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('Connected to WebSocket');
                client.subscribe('/user/queue/search-results', (message) => {
                    const payload = message.body;
                    if (payload === "SEARCH_COMPLETE") {
                        setSearchStatus('搜索完成。'); return;
                    }
                    if (payload.startsWith("SEARCH_ERROR:")) {
                        setSearchStatus(`搜索出错: ${payload}`); return;
                    }
                    const foundNode = JSON.parse(payload);
                    setSearchResults(prev => [...prev, foundNode]);
                });
            },
            onStompError: (frame) => console.error('STOMP Error:', frame),
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
            }
        };
    }, [token]);

    const handleSearch = (query) => {
        if (query.length < 1) {
            Swal.fire({ icon: 'warning', title: '请输入搜索内容' });
            return;
        }
        const { activeId, activeType } = useAuthStore.getState();

        setSearchResults([]);
        setSearchStatus('正在搜索...');
        setSearchModalOpen(true);

        if (stompClientRef.current?.connected) {
            // 构建包含课程ID的搜索路径
            let searchPath = '/';
            if (currentCourseId) {
                searchPath = `/${currentCourseId}`;
            }
            stompClientRef.current.publish({
                destination: '/app/ware/search',
                body: JSON.stringify({
                    path: searchPath,
                    namePattern: query,
                    activeClassId: activeType === 'class' ? activeId : null,
                    activeSchoolId: activeType === 'school' ? activeId : null
                })
            });
        } else {
            setSearchStatus('WebSocket 未连接，无法搜索。');
            console.error('STOMP client is not connected.');
        }
    };

    // 这个函数现在只负责导航，不再处理路径拼接逻辑
    const navigateToFinalPath = (finalPath) => {
        console.log('[navigateToFinalPath] finalPath:', finalPath, 'currentCourseId:', currentCourseId);
        
        // 1. 移除任何可能的 /ware/home 前缀（防止重复拼接）
        let processedPath = finalPath;
        if (processedPath.includes('/ware/home')) {
            processedPath = processedPath.replace(/\/ware\/home/g, '');
            console.log('[navigateToFinalPath] removed /ware/home prefix, processedPath:', processedPath);
        }
        
        // 2. 简单的路径规范化，防止出现 "//"
        const normalizedPath = processedPath.replace(/\/+/g, '/');

        // 3. 如果结果只是一个单独的'/'，确保我们导航到根目录
        // 并且移除末尾的斜杠，除非是根目录
        const cleanPath = normalizedPath.length > 1 && normalizedPath.endsWith('/')
            ? normalizedPath.slice(0, -1)
            : normalizedPath;
        console.log('[navigateToFinalPath] cleanPath:', cleanPath);

        // 4. 构建包含课程ID的完整URL路径
        let fullPath;
        if (currentCourseId) {
            const courseIdStr = String(currentCourseId);
            // 检查路径是否已经以课程ID开头
            if (cleanPath.startsWith(`/${courseIdStr}/`) || cleanPath === `/${courseIdStr}`) {
                // 路径已经包含课程ID，直接使用
                fullPath = cleanPath;
                console.log('[navigateToFinalPath] path already contains courseId, using:', fullPath);
            } else if (cleanPath === '/') {
                fullPath = `/${courseIdStr}`;
                console.log('[navigateToFinalPath] root path, using:', fullPath);
            } else {
                fullPath = `/${courseIdStr}${cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath}`;
                console.log('[navigateToFinalPath] added courseId prefix, using:', fullPath);
            }
        } else {
            fullPath = cleanPath;
            console.log('[navigateToFinalPath] no currentCourseId, using:', fullPath);
        }
        
        const targetUrl = `/ware/home${fullPath || '/'}`;
        console.log('[navigateToFinalPath] navigating to:', targetUrl);
        navigate(targetUrl);
    };

    // 这个函数来自 WareHeader，现在它包含了正确的“cd命令”逻辑
    const handlePathInputChange = (userInput) => {
        let targetPath;

        // --- 核心逻辑：完全复现原生JS代码 ---
        // 1. 判断输入是绝对路径还是相对路径
        if (userInput.startsWith('/')) {
            // 如果是绝对路径，直接使用
            targetPath = userInput;
        } else {
            // 如果是相对路径，使用 buildNewPath 进行拼接
            targetPath = buildNewPath(currentPath, userInput);
        }

        // 2. 调用导航函数
        navigateToFinalPath(targetPath);
    };

    return (
        <div className={styles.fileManager}>
            <WareHeader
                onNew={() => setNewItemModalOpen(true)}
                onSearch={handleSearch}
                onPathChange={handlePathInputChange}
                isTeacher={isTeacher || isAdmin || isPrincipal}
            />
            <Breadcrumb currentPath={currentPath} navigate={(path) => navigateToFinalPath(path)} />

            <main className={styles.fileManagerMain}>
                {isLoading ? <Spinner /> : <FileTable nodes={nodes} currentPath={currentPath} refresh={() => fetchNodes(currentPath)} onNavigate={(path) => navigateToFinalPath(path)} />}
            </main>

            <NewItemModal
                isOpen={isNewItemModalOpen}
                onClose={() => setNewItemModalOpen(false)}
                currentPath={currentPath}
                onSuccess={() => fetchNodes(currentPath)}
            />
            <SearchResultsModal
                isOpen={isSearchModalOpen}
                onClose={() => setSearchModalOpen(false)}
                results={searchResults}
                status={searchStatus}
            />
        </div>
    );
};

export default WarePage;