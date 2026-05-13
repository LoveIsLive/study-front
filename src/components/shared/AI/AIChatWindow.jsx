import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faPaperPlane,
  faSpinner,
  faBars,
  faPlus,
  faTrashAlt,
  faPaperclip,
  faFileAlt,
  faCodeBranch,
  faBuilding,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import ReactMarkdown from "react-markdown";
import Swal from "sweetalert2";

import useAuthStore from "../../../store/authStore";
import useAIStore from "../../../store/aiStore";
import { config } from "../../../utils/config";
import { baseApi } from "../../../services/api";
import { useDraggable } from "../../../hooks/useDraggable";
import { useUploader } from "../../../hooks/useUploader";
import { formatFileSize } from "../../../utils/helpers";
import styles from "./AIChatWindow.module.css";
import AIChart from "./AIChart";

const ThinkingBubble = () => (
  <div className={styles.thinkingBubble}>
    <div className={styles.dot}></div>
    <div className={styles.dot}></div>
    <div className={styles.dot}></div>
    <span style={{ fontSize: "0.85rem", color: "#0984e3", marginLeft: "6px" }}>
      AI 正在思考...
    </span>
  </div>
);

const RemoteFileCard = ({ fileItem }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const isImage = fileItem.mimeTypeName?.startsWith("image/");
  const handleClick = async () => {
    try {
      const res = await baseApi.get("/llm/get/downloadId", {
        params: { path: fileItem.path, fileName: fileItem.fileName },
      });
      if (res.data.code === 200)
        window.open(
          `${config.back_base_url}/llm/download?path=${encodeURIComponent(fileItem.path)}&mode=inline&token=${res.data.data}`,
          "_blank",
        );
    } catch (e) {
      Swal.fire({
        toast: true,
        icon: "error",
        title: "无法预览文件",
        position: "top",
        customClass: { container: styles.swalHighZIndex },
      });
    }
  };
  useEffect(() => {
    if (!isImage || !fileItem.path) return;
    let isMounted = true;
    const loadImg = async () => {
      try {
        const res = await baseApi.get("/llm/get/downloadId", {
          params: { path: fileItem.path, fileName: fileItem.fileName },
        });
        if (res.data.code === 200 && isMounted)
          setPreviewUrl(
            `${config.back_base_url}/llm/download?path=${encodeURIComponent(fileItem.path)}&mode=inline&token=${res.data.data}`,
          );
      } catch (e) {}
    };
    loadImg();
    return () => {
      isMounted = false;
    };
  }, [fileItem, isImage]);
  return (
    <div className={styles.fileChip} onClick={handleClick} title="点击预览">
      {isImage ? (
        <div className={styles.imageWrapper}>
          {previewUrl ? (
            <img src={previewUrl} className={styles.fileThumbnail} />
          ) : (
            <div className={styles.fileIconPlaceholder}>
              <FontAwesomeIcon icon={faSpinner} spin />
            </div>
          )}
        </div>
      ) : (
        <div className={styles.fileIconPlaceholder}>
          <FontAwesomeIcon icon={faFileAlt} />
        </div>
      )}
      <div className={styles.fileInfo}>
        <span className={styles.fileName}>{fileItem.fileName}</span>
        <span className={styles.fileSize}>
          {formatFileSize(fileItem.fileSize)}
        </span>
      </div>
    </div>
  );
};

const LocalFileCard = ({ file, onRemove, onPreview }) => {
  const isImage = file.type?.startsWith("image/") || false;
  const [fileUrl, setFileUrl] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const handleCardClick = () => {
    if (!fileUrl) return;
    isImage ? onPreview(fileUrl) : window.open(fileUrl, "_blank");
  };
  return (
    <div className={styles.fileChip} onClick={handleCardClick} title="点击预览">
      {onRemove && (
        <button
          className={styles.removeFileBtn}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          &times;
        </button>
      )}
      {isImage ? (
        <div className={styles.imageWrapper}>
          <img src={fileUrl} className={styles.fileThumbnail} />
        </div>
      ) : (
        <div className={styles.fileIconPlaceholder}>
          <FontAwesomeIcon icon={faFileAlt} />
        </div>
      )}
      <div className={styles.fileInfo}>
        <span className={styles.fileName}>{file.name}</span>
        <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
      </div>
    </div>
  );
};

const AIChatWindow = ({ onClose, initialSessionId }) => {
  const { token } = useAuthStore();
  const { context, availableScene, isSceneActive, toggleSceneActive } =
    useAIStore();

  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [useAgent, setUseAgent] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  // 核心锁
  const isProcessingAutoSendRef = useRef(false);
  const skipHistoryLoadRef = useRef(false);

  const llmApiClient = useMemo(
    () => ({
      post: (url, data, config) => baseApi.post(`/llm${url}`, data, config),
    }),
    [],
  );
  const { isUploading, startUpload } = useUploader(llmApiClient);
  const { position, dragRef, handleMouseDown } = useDraggable({
    x: Math.max(0, window.innerWidth - 1000),
    y: Math.max(0, window.innerHeight - 800),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height =
        Math.min(textAreaRef.current.scrollHeight, 150) + "px";
    }
  }, [inputValue]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await baseApi.get("/llm/sessions");
      if (res.data.code === 200) setSessions(res.data.data || []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);
  useEffect(() => {
    if (initialSessionId && !currentSessionId)
      setCurrentSessionId(initialSessionId);
  }, [initialSessionId, currentSessionId]);

  const loadHistory = useCallback(async (sessionId) => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await baseApi.get(`/llm/history/${sessionId}`);
      if (res.data.code === 200) {
        const history = res.data.data.map((m) => {
          if (m.type === "file") {
            try {
              const parsed = JSON.parse(m.content);
              return {
                ...m,
                content: parsed.text || "",
                fileItems: parsed.files || [],
                type: "file",
              };
            } catch (e) {
              return { ...m, type: "text", content: "消息解析失败" };
            }
          }
          if (m.type === "tool" && m.role === "assistant") {
            try {
              const messageObj = JSON.parse(m.content);
              return {
                ...m,
                type: "agent_result",
                content: messageObj.content,
                toolCalls: messageObj.tool_calls,
                isChart: messageObj.tool_calls?.some(
                  (t) => t.function.name === "EChartsTool",
                ),
              };
            } catch (e) {
              return { ...m, type: "text", content: m.content };
            }
          }
          return { ...m, type: "text" };
        });
        setMessages(history);
      }
    } catch (e) {
      setMessages([
        { role: "assistant", type: "error", content: "加载历史记录失败" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      if (skipHistoryLoadRef.current) {
        skipHistoryLoadRef.current = false;
      } else {
        loadHistory(currentSessionId);
      }
    } else {
      setMessages([]);
    }
  }, [currentSessionId, loadHistory]);

  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files).filter((file) => {
      if (file.size > 1024 * 1024 * 1024) {
        Swal.fire({
          toast: true,
          icon: "warning",
          title: "超过 1GB限制",
          position: "top",
          customClass: { container: styles.swalHighZIndex },
        });
        return false;
      }
      return true;
    });
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeSelectedFile = (index) =>
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSend = async (overrideMsg = null, overrideSessionId = null) => {
    const isEvent =
      overrideMsg && typeof overrideMsg.preventDefault === "function";
    const userText = typeof overrideMsg === "string" ? overrideMsg : inputValue;
    const activeSessionId = overrideSessionId || currentSessionId;
    if ((!userText.trim() && selectedFiles.length === 0) || !activeSessionId)
      return;

    if (!isEvent && typeof overrideMsg === "string") {
    } else {
      setInputValue("");
    }
    const currentFiles = [...selectedFiles];
    setSelectedFiles([]);
    if (textAreaRef.current) textAreaRef.current.style.height = "auto";
    setIsSending(true);

    const newUserMsg = {
      role: "user",
      content: userText,
      localFiles: currentFiles,
      id: Date.now(),
      type: currentFiles.length > 0 ? "file" : "text",
    };
    const newAiMsg = {
      role: "assistant",
      content: "",
      id: Date.now() + 1,
      isWaitingFirstResponse: true,
      type: "text",
    };

    if (overrideSessionId) {
      setMessages([newUserMsg, newAiMsg]);
    } else {
      setMessages((prev) => [...prev, newUserMsg, newAiMsg]);
    }

    try {
      const { smallFiles, largeFileAttachmentIds } =
        await startUpload(currentFiles);
      const formData = new FormData();
      const requestDTO = {
        sessionId: activeSessionId,
        message: userText || " ",
        scene: context.scene,
        sceneParams: context.sceneParams,
      };
      if (largeFileAttachmentIds.length > 0)
        requestDTO.uploadFiles = largeFileAttachmentIds.map((i) => ({
          fileName: i.fileName,
          filePath: i.filePath,
        }));
      formData.append(
        "request",
        new Blob([JSON.stringify(requestDTO)], { type: "application/json" }),
      );
      smallFiles.forEach((file) => formData.append("files", file));

      if (useAgent) {
        const response = await baseApi.post("/llm/chat/agent", formData);
        const messageObj = response.data.data;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newAiMsg.id
              ? {
                  ...msg,
                  isWaitingFirstResponse: false,
                  type: "agent_result",
                  content: messageObj.content,
                  toolCalls: messageObj.tool_calls,
                  isChart: messageObj.tool_calls?.some(
                    (t) => t.function.name === "EChartsTool",
                  ),
                }
              : msg,
          ),
        );
      } else {
        // 【关键恢复点】：添加鉴权 Header 以支持管理员 / 校长权限下的后端物理路径操作
        const authState = useAuthStore.getState();
        const fetchHeaders = { Authorization: `Bearer ${token}` };

        if (authState.activeType === "class" && authState.activeId) {
          fetchHeaders["X-Active-Class-Id"] = String(authState.activeId);
        } else if (authState.activeType === "school" && authState.activeId) {
          fetchHeaders["X-Active-School-Id"] = String(authState.activeId);
        }

        const response = await fetch(
          `${config.back_base_url}/llm/chat/stream`,
          {
            method: "POST",
            headers: fetchHeaders,
            body: formData,
          },
        );
        if (!response.ok) throw new Error("网络错误");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiContent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split("\n");
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            try {
              const json = JSON.parse(line.slice(5));
              const chunk = json.c || json.content;
              if (chunk) {
                aiContent += chunk;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === newAiMsg.id
                      ? {
                          ...m,
                          content: aiContent,
                          isWaitingFirstResponse: false,
                          isStreaming: true,
                        }
                      : m,
                  ),
                );
              }
            } catch (e) {}
          }
        }
      }
      fetchSessions();
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newAiMsg.id
            ? {
                role: "assistant",
                type: "error",
                content: "请求失败",
                isWaitingFirstResponse: false,
              }
            : m,
        ),
      );
    } finally {
      setIsSending(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newAiMsg.id
            ? { ...m, isStreaming: false, isWaitingFirstResponse: false }
            : m,
        ),
      );
    }
  };

  useEffect(() => {
    const processAutoSend = async () => {
      const params = context.sceneParams;
      if (context.scene === "file-summary" && params?.autoSendMsg) {
        if (isProcessingAutoSendRef.current) return;
        isProcessingAutoSendRef.current = true;

        const msg = params.autoSendMsg;
        const requireNew = params.requireNewChat;

        useAIStore
          .getState()
          .setContext("file-summary", {
            ...params,
            autoSendMsg: null,
            requireNewChat: false,
          });

        let targetId = currentSessionId;
        if (requireNew) {
          try {
            const res = await baseApi.get("/llm/session/new");
            if (res.data.code === 200) {
              targetId = res.data.data;
              skipHistoryLoadRef.current = true;
              setMessages([]);
              await fetchSessions();
              setCurrentSessionId(targetId);
              if (window.innerWidth < 800) setIsSidebarOpen(false);
            }
          } catch (e) {}
        }

        if (targetId) {
          setTimeout(() => {
            handleSend(msg, targetId);
            setTimeout(() => {
              isProcessingAutoSendRef.current = false;
            }, 500);
          }, 50);
        } else {
          isProcessingAutoSendRef.current = false;
        }
      }
    };
    processAutoSend();
  }, [context.sceneParams?.autoSendMsg, fetchSessions, currentSessionId]);

  const handleNewChat = async () => {
    try {
      const res = await baseApi.get("/llm/session/new");
      if (res.data.code === 200) {
        setMessages([]);
        setCurrentSessionId(res.data.data);
        fetchSessions();
        if (window.innerWidth < 800) setIsSidebarOpen(false);
      }
    } catch (e) {}
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    const res = await Swal.fire({
      title: "删除会话?",
      icon: "warning",
      showCancelButton: true,
      customClass: { container: styles.swalHighZIndex },
    });
    if (res.isConfirmed) {
      await baseApi.delete(`/llm/session/${id}`);
      setSessions((prev) => prev.filter((s) => s.sessionId !== id));
      if (id === currentSessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && (inputValue.trim() || selectedFiles.length > 0))
        handleSend();
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.type === "error")
      return (
        <div
          style={{
            color: "#d63031",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <FontAwesomeIcon icon={faExclamationCircle} /> {msg.content}
        </div>
      );
    if (msg.isWaitingFirstResponse) return <ThinkingBubble />;

    const renderFiles = () => (
      <>
        {msg.localFiles && msg.localFiles.length > 0 && (
          <div className={styles.filePreviewArea}>
            {msg.localFiles.map((f, i) => (
              <LocalFileCard key={i} file={f} onPreview={setPreviewImage} />
            ))}
          </div>
        )}
        {msg.fileItems && msg.fileItems.length > 0 && (
          <div className={styles.filePreviewArea}>
            {msg.fileItems.map((f, i) => (
              <RemoteFileCard key={i} fileItem={f} />
            ))}
          </div>
        )}
      </>
    );

    if (
      msg.type === "agent_result" ||
      (msg.type === "tool" && msg.role === "assistant")
    ) {
      const tools = msg.toolCalls || [];
      return (
        <>
          {renderFiles()}
          {msg.content && <ReactMarkdown>{msg.content}</ReactMarkdown>}
          {tools.map((toolCall, idx) => {
            const func = toolCall.function;
            let args = {};
            try {
              args = JSON.parse(func.arguments);
            } catch (e) {
              args = func.arguments;
            }
            if (func.name === "ReplayTool")
              return (
                <div key={idx} style={{ marginTop: "10px" }}>
                  <ReactMarkdown>{args.message || args}</ReactMarkdown>
                </div>
              );
            if (func.name === "EChartsTool")
              return (
                <div key={idx} className={styles.chartContainer}>
                  <AIChart
                    option={JSON.parse(args.option)}
                    title={args.explanation}
                  />
                </div>
              );
            return (
              <div key={idx} className={styles.toolContainer}>
                <div className={styles.toolHeader}>
                  <FontAwesomeIcon icon={faCodeBranch} /> 调用工具: {func.name}
                </div>
                <div className={styles.toolBody}>
                  {JSON.stringify(args, null, 2)}
                </div>
              </div>
            );
          })}
        </>
      );
    }
    return (
      <>
        {renderFiles()}
        <ReactMarkdown>{msg.content}</ReactMarkdown>
        {msg.isStreaming && (
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "14px",
              background: "#2d3436",
              marginLeft: "4px",
              animation: "blink 1s infinite",
            }}
          ></span>
        )}
      </>
    );
  };

  return (
    <>
      <div
        className={styles.chatWindow}
        style={{ left: position.x, top: position.y }}
        ref={dragRef}
      >
        <div className={styles.header} onMouseDown={handleMouseDown}>
          <div className={`${styles.titleArea} no-drag`}>
            <button
              className={styles.toggleSidebarBtn}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
            <div className={styles.titleText}>
              <h3>AI 教学助手</h3>
              <span>{useAgent ? "Agent 模式" : "对话模式"}</span>
            </div>
          </div>
          <button className={`${styles.closeButton} no-drag`} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className={styles.contentContainer}>
          <div
            className={`${styles.sidebar} ${!isSidebarOpen ? styles.collapsed : ""}`}
          >
            <button className={styles.newChatBtn} onClick={handleNewChat}>
              <FontAwesomeIcon icon={faPlus} /> 新建对话
            </button>
            <div className={styles.sessionList}>
              {sessions.map((s) => (
                <div
                  key={s.sessionId}
                  className={`${styles.sessionItem} ${s.sessionId === currentSessionId ? styles.active : ""}`}
                  onClick={() => setCurrentSessionId(s.sessionId)}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {s.title}
                  </span>
                  <button
                    className={styles.deleteSessionBtn}
                    onClick={(e) => handleDeleteSession(e, s.sessionId)}
                  >
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.mainArea}>
            <div className={styles.messageList}>
              {messages.length === 0 && !isLoading && (
                <div className={styles.emptyState}>
                  <h1>ASK ME</h1>
                  <span>我能为您做些什么？</span>
                </div>
              )}
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`${styles.message} ${msg.role === "user" ? styles.userMessage : styles.aiMessage}`}
                >
                  <div className={styles.messageContent}>
                    {renderMessageContent(msg)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className={styles.footer}>
              <div className={styles.toolbar}>
                <div
                  className={styles.agentSwitch}
                  onClick={() => setUseAgent(!useAgent)}
                >
                  <div
                    className={`${styles.switchTrack} ${useAgent ? styles.active : ""}`}
                  >
                    <div className={styles.switchKnob}></div>
                  </div>
                  <span>Agent 模式</span>
                </div>
                {availableScene && (
                  <div
                    className={styles.agentSwitch}
                    onClick={toggleSceneActive}
                    title={`开启后，AI将获取${availableScene === "organization" ? "组织架构" : "当前页面"}相关数据`}
                  >
                    <div
                      className={`${styles.switchTrack} ${styles.blueTrack} ${isSceneActive ? styles.active : ""}`}
                    >
                      <div className={styles.switchKnob}></div>
                    </div>
                    <span>
                      <FontAwesomeIcon
                        icon={faBuilding}
                        style={{
                          marginRight: "4px",
                          color: isSceneActive ? "#0984e3" : "#b2bec3",
                        }}
                      />
                      {availableScene === "organization"
                        ? "获取组织数据"
                        : "获取页面数据"}
                    </span>
                  </div>
                )}
              </div>
              {selectedFiles.length > 0 && (
                <div className={styles.filePreviewArea}>
                  {selectedFiles.map((f, i) => (
                    <LocalFileCard
                      key={i}
                      file={f}
                      onRemove={() => removeSelectedFile(i)}
                      onPreview={setPreviewImage}
                    />
                  ))}
                </div>
              )}
              <div className={styles.inputWrapper}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  multiple
                  accept="image/*,text/*,.txt,.md,.json,.js,.java,.py,.c,.cpp,.h,.css,.html"
                  onChange={handleFileSelect}
                />
                <button
                  className={styles.iconBtn}
                  onClick={() => fileInputRef.current.click()}
                  title="上传文件"
                >
                  <FontAwesomeIcon icon={faPaperclip} />
                </button>
                <textarea
                  ref={textAreaRef}
                  className={styles.textInput}
                  placeholder="输入消息..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className={`${styles.iconBtn} ${styles.primary}`}
                  onClick={() => handleSend()}
                  disabled={
                    isSending ||
                    isUploading ||
                    (!inputValue.trim() && selectedFiles.length === 0)
                  }
                >
                  {isSending || isUploading ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {previewImage && (
        <div
          className={styles.imageLightbox}
          onClick={() => setPreviewImage(null)}
        >
          <div className={styles.closeLightbox}>&times;</div>
          <img
            src={previewImage}
            alt="Preview"
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default AIChatWindow;
