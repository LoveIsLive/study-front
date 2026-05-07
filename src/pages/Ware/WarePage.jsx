import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import useAuthStore from "../../store/authStore";
import { wareApi } from "../../services/api";
import { buildNewPath } from "../../utils/helpers";
import Breadcrumb from "./components/Breadcrumb";
import FileTable from "./components/FileTable";
import WareHeader from "./components/WareHeader";
import NewItemModal from "./components/NewItemModal";
import SearchResultsModal from "./components/SearchResultsModal";
import Spinner from "../../components/common/Spinner/Spinner";
import styles from "./WarePage.module.css";
import Swal from "sweetalert2";

const WarePage = ({ courseId: propCourseId }) => {
  const { token } = useAuthStore();
  const storeCourseId = useAuthStore((state) => state.activeCourseId);
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());

  const [nodes, setNodes] = useState([]);
  const [currentPath, setCurrentPath] = useState("/");
  const [isLoading, setIsLoading] = useState(true);

  const [isNewItemModalOpen, setNewItemModalOpen] = useState(false);
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const stompClientRef = useRef(null);

  // =========================================================================
  // 1. 核心隔离引擎：解析当前 URL，提取 模式(mode)、课程ID(cid) 和 相对路径(relPath)
  // =========================================================================
  const routeInfo = useMemo(() => {
    // 过滤掉空字符串，将路径切割成数组。例如：
    // /ware/home/17/hello -> ['ware', 'home', '17', 'hello']
    // /course/17/ware/hello -> ['course', '17', 'ware', 'hello']
    const pathParts = decodeURIComponent(location.pathname)
      .split("/")
      .filter(Boolean);

    let mode = "global"; // 默认为全局仓库模式
    let cid = propCourseId || storeCourseId; // 兜底的 courseId
    let relPath = "/"; // 发送给后端的相对查询路径

    if (pathParts[0] === "course") {
      // --- 模式A：在课程详情的新标签页中 ---
      mode = "courseDetail";
      cid = pathParts[1] || cid;

      const wareIndex = pathParts.indexOf("ware");
      if (wareIndex !== -1 && wareIndex < pathParts.length - 1) {
        // 提取 'ware' 之后的所有路径作为内部相对路径
        relPath = "/" + pathParts.slice(wareIndex + 1).join("/");
      }
    } else if (pathParts[0] === "ware" && pathParts[1] === "home") {
      // --- 模式B：在全局左侧固定栏中 ---
      mode = "global";
      if (pathParts.length > 2) {
        cid = pathParts[2];
        if (pathParts.length > 3) {
          // 提取 '17' 之后的所有路径作为内部相对路径
          relPath = "/" + pathParts.slice(3).join("/");
        }
      }
    }

    return { mode, activeCourseId: cid, relPath };
  }, [location.pathname, propCourseId, storeCourseId]);

  const { mode, activeCourseId, relPath: currentRelativePath } = routeInfo;

  // =========================================================================
  // 2. 跳转隔离器：根据当前所处的 mode 组装绝对 URL，互不跨越
  // =========================================================================
  const navigateToFinalPath = useCallback(
    (targetRelativePath) => {
      // 规范化路径，去掉多余的斜杠
      let normalizedPath = targetRelativePath.replace(/\/+/g, "/");
      if (!normalizedPath.startsWith("/")) {
        normalizedPath = "/" + normalizedPath;
      }
      if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
        normalizedPath = normalizedPath.slice(0, -1);
      }

      let targetUrl = "";
      if (mode === "courseDetail") {
        // 如果当前是新标签页详情，跳转依然锁定在 /course/... 下
        targetUrl = `/course/${activeCourseId}/ware${normalizedPath === "/" ? "" : normalizedPath}`;
      } else {
        // 如果当前是左侧边栏，跳转依然锁定在 /ware/home/... 下
        targetUrl = `/ware/home/${activeCourseId}${normalizedPath === "/" ? "" : normalizedPath}`;
      }

      navigate(targetUrl);
    },
    [mode, activeCourseId, navigate],
  );

  // =========================================================================
  // 3. API 请求器：发送请求时，永远只发送干净的相对路径（符合您的第二点结构要求）
  // =========================================================================
  const fetchNodes = useCallback(
    async (apiPath) => {
      setIsLoading(true);
      try {
        if (!activeCourseId) {
          Swal.fire({
            icon: "warning",
            title: "请先选择课程",
            text: "您需要先选择一个课程才能访问课程仓库",
          });
          navigate("/");
          return;
        }

        // apiPath 永远是类似 "/" 或 "/hello" 或 "/hello/test" 的相对路径
        const response = await wareApi.get("/get/dir", {
          params: { path: apiPath },
        });
        setNodes(response.data.data.fileObjectDescs || []);
        setCurrentPath(apiPath);
      } catch (error) {
        console.error("Failed to fetch nodes:", error);
        Swal.fire({
          icon: "error",
          title: "加载失败",
          text: error.response?.data?.message || "可能路径不存在或无权限",
        });
        // 报错时，退回当前模式下的根目录，不越界
        if (mode === "courseDetail") {
          navigate(`/course/${activeCourseId}/ware`);
        } else {
          navigate(`/ware/home/${activeCourseId}`);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [activeCourseId, navigate, mode],
  );

  // 监听 URL 变化并触发数据获取
  useEffect(() => {
    const decodedPath = decodeURIComponent(location.pathname);

    if (!activeCourseId) {
      Swal.fire({
        icon: "warning",
        title: "请先选择课程",
        text: "您需要先选择一个课程才能访问课程仓库",
      });
      navigate("/");
      return;
    }

    // 在全局模式下，如果用户只点击了 /ware/home（未带ID），帮他带上当前的课程ID重定向
    if (decodedPath === "/ware/home" || decodedPath === "/ware/home/") {
      navigate(`/ware/home/${activeCourseId}`);
      return;
    }

    // 根据从 URL 拆解出来的干净内部路径发起查询
    fetchNodes(currentRelativePath);
  }, [
    location.pathname,
    activeCourseId,
    currentRelativePath,
    fetchNodes,
    navigate,
  ]);

  // =========================================================================
  // 4. WebSocket及杂项
  // =========================================================================
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS("/ws/search"),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe("/user/queue/search-results", (message) => {
          const payload = message.body;
          if (payload === "SEARCH_COMPLETE") {
            setSearchStatus("搜索完成。");
            return;
          }
          if (payload.startsWith("SEARCH_ERROR:")) {
            setSearchStatus(`搜索出错: ${payload}`);
            return;
          }
          const foundNode = JSON.parse(payload);
          setSearchResults((prev) => [...prev, foundNode]);
        });
      },
      onStompError: (frame) => console.error("STOMP Error:", frame),
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
      Swal.fire({ icon: "warning", title: "请输入搜索内容" });
      return;
    }
    const { activeId, activeType } = useAuthStore.getState();

    setSearchResults([]);
    setSearchStatus("正在搜索...");
    setSearchModalOpen(true);

    if (stompClientRef.current?.connected) {
      let searchPath = "/";
      if (activeCourseId) {
        searchPath = `/${activeCourseId}`;
      }
      stompClientRef.current.publish({
        destination: "/app/ware/search",
        body: JSON.stringify({
          path: searchPath,
          namePattern: query,
          activeClassId: activeType === "class" ? activeId : null,
          activeSchoolId: activeType === "school" ? activeId : null,
        }),
      });
    } else {
      setSearchStatus("WebSocket 未连接，无法搜索。");
      console.error("STOMP client is not connected.");
    }
  };

  const handlePathInputChange = (userInput) => {
    let targetPath;
    if (userInput.startsWith("/")) {
      targetPath = userInput;
    } else {
      targetPath = buildNewPath(currentRelativePath, userInput);
    }
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
      <Breadcrumb
        currentPath={currentPath}
        navigate={(path) => navigateToFinalPath(path)}
      />

      <main className={styles.fileManagerMain}>
        {isLoading ? (
          <Spinner />
        ) : (
          <FileTable
            nodes={nodes}
            currentPath={currentPath}
            refresh={() => fetchNodes(currentPath)}
            onNavigate={(path) => navigateToFinalPath(path)}
          />
        )}
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
