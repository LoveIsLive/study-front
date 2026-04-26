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
            // 构建带课程ID的路径
            let apiPath = path;
            if (currentCourseId) {
                // 确保路径以课程ID开头
                if (!path.startsWith(`/${currentCourseId}`)) {
                    apiPath = `/${currentCourseId}${path.startsWith('/') ? path : '/' + path}`;
                }
            } else {
                // 没有选择课程，重定向到根目录或显示提示
                Swal.fire({ icon: 'warning', title: '请先选择课程', text: '您需要先选择一个课程才能访问课程仓库' });
                navigate('/');
                return;
            }
            
            const response = await wareApi.get('/get/dir', { params: { path: apiPath } });
            setNodes(response.data.data.fileObjectDescs || []);
            setCurrentPath(path);
        } catch (error) {
            console.error('Failed to fetch nodes:', error);
            Swal.fire({ icon: 'error', title: '加载失败', text: '可能路径不存在或无权限' });
            navigate('/ware/home/');
        } finally {
            setIsLoading(false);
        }
    }, [navigate, currentCourseId]);

    // --- 关键修正部分 ---
    useEffect(() => {
        // 解析URL路径，支持两种格式：
        // 1. /ware/home/{courseId}/{path} - 新格式，带课程ID
        // 2. /ware/home/{path} - 旧格式，不带课程ID
        const pathWithoutPrefix = location.pathname.replace(/^\/ware\/home/, '') || '/';
        
        try {
            let decodedPath = decodeURIComponent(pathWithoutPrefix);
            
            // 检查路径是否以课程ID开头
            if (currentCourseId) {
                const courseIdStr = String(currentCourseId);
                // 如果路径以课程ID开头，移除它（因为fetchNodes会添加）
                if (decodedPath.startsWith(`/${courseIdStr}/`) || decodedPath === `/${courseIdStr}`) {
                    decodedPath = decodedPath.replace(`/${courseIdStr}`, '') || '/';
                }
                // 如果路径不以课程ID开头，保持原样（fetchNodes会添加课程ID）
            } else if (decodedPath !== '/') {
                // 没有当前课程但路径不是根目录，重定向到首页
                Swal.fire({ icon: 'warning', title: '请先选择课程', text: '您需要先选择一个课程才能访问课程仓库' });
                navigate('/');
                return;
            }
            
            // 使用解码后的路径获取数据
            fetchNodes(decodedPath);
        } catch (e) {
            console.error("Failed to decode URI component:", pathWithoutPrefix, e);
            // 如果解码失败（例如URL格式错误），则导航到根目录
            navigate('/ware/home/');
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
            stompClientRef.current.publish({
                destination: '/app/ware/search',
                body: JSON.stringify({
                    path: '/',
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
        // 简单的路径规范化，防止出现 "//"
        const normalizedPath = finalPath.replace(/\/+/g, '/');

        // 如果结果只是一个单独的'/'，确保我们导航到根目录
        // 并且移除末尾的斜杠，除非是根目录
        const cleanPath = normalizedPath.length > 1 && normalizedPath.endsWith('/')
            ? normalizedPath.slice(0, -1)
            : normalizedPath;

        // 添加课程ID前缀
        const fullPath = currentCourseId ? `/${currentCourseId}${cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath}` : cleanPath;
        
        navigate(`/ware/home${fullPath || '/'}`);
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