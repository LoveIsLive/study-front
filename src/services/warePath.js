/**
 * 去掉路径末尾多出来的一个斜杠。
 * 根目录 "/" 保留。连续斜杠 "//" 不在这里处理，留给后端判非法。
 */
export function stripTrailingSlash(path) {
  if (typeof path !== "string" || path.length <= 1 || !path.endsWith("/")) {
    return path;
  }
  if (path.endsWith("//")) {
    return path;
  }
  return path.slice(0, -1);
}

/**
 * 给非管理员/校长的仓库路径补上课程 ID 前缀。
 * 根目录得到 "/{courseId}"，已带前缀的 "/{courseId}/" 也会收成 "/{courseId}"。
 */
export function withCoursePrefix(rawPath, courseIdStr) {
  let path = rawPath ?? "";
  if (path.includes("/ware/home")) {
    path = path.replace(/\/ware\/home/g, "");
  }
  path = stripTrailingSlash(path);
  if (path.startsWith(`/${courseIdStr}`)) {
    return path;
  }
  if (path === "/" || path === "") {
    return `/${courseIdStr}`;
  }
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  return `/${courseIdStr}${stripTrailingSlash(normalizedPath)}`;
}
