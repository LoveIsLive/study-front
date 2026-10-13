/**
 * 给非管理员/校长的仓库路径补上课程 ID 前缀。
 * 根目录必须得到 "/{courseId}"。拼成 "/{courseId}/" 会被后端判为非法路径。
 */
export function withCoursePrefix(rawPath, courseIdStr) {
  let path = rawPath;
  if (path.includes("/ware/home")) {
    path = path.replace(/\/ware\/home/g, "");
  }
  if (path.startsWith(`/${courseIdStr}`)) {
    return path;
  }
  if (path === "/" || path === "") {
    return `/${courseIdStr}`;
  }
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  return `/${courseIdStr}${normalizedPath}`;
}
