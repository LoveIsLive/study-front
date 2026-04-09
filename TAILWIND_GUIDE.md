# Tailwind CSS 集成指南

## ✅ 安装完成

### 已安装的依赖

- `tailwindcss` - Tailwind CSS 核心库
- `postcss` - CSS 处理工具
- `autoprefixer` - 自动添加浏览器前缀

### 已创建的配置文件

- `tailwind.config.js` - Tailwind 配置
- `postcss.config.js` - PostCSS 配置
- `src/index.css` - 已导入 Tailwind 指令

## 📝 如何在项目中使用

### 方式1：完全使用 Tailwind（推荐新组件）

```jsx
export function MyComponent() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">标题</h1>
      <p className="text-lg text-gray-600">描述</p>
    </div>
  );
}
```

### 方式2：混合 CSS Module 和 Tailwind（推荐现有组件）

```jsx
import styles from "./MyComponent.module.css";

export function MyComponent() {
  return (
    <div className={`${styles.container} p-4 bg-white rounded-lg`}>
      <h1 className="text-2xl font-bold">标题</h1>
    </div>
  );
}
```

### 方式3：条件类名（使用 classnames 库）

```jsx
// 先安装: npm install classnames
import classnames from "classnames";
import styles from "./MyComponent.module.css";

export function MyComponent({ isActive }) {
  return (
    <button
      className={classnames(
        "px-4 py-2 rounded-lg font-medium transition-colors",
        isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900",
      )}
    >
      点击
    </button>
  );
}
```

## 🎨 常用 Tailwind 类名

### 布局

```
flex, grid, block, inline-block, absolute, relative, fixed
max-w-6xl, w-full, h-screen, container, mx-auto, px-4, py-8
gap-4, space-y-2, space-x-4
```

### 文本

```
text-sm, text-base, text-lg, text-2xl, text-3xl
font-bold, font-semibold, font-medium, font-light
text-gray-900, text-gray-600, text-red-500
text-center, text-left, text-right
```

### 颜色和背景

```
bg-white, bg-gray-100, bg-blue-500, bg-red-500
text-white, text-gray-900, text-gray-600
border, border-gray-300, border-2
rounded-lg, rounded-xl, rounded-full
```

### 交互

```
hover:bg-blue-600, focus:outline-none, focus:ring-2
active:bg-blue-700, disabled:opacity-50
transition-all, transition-colors, duration-200
```

### 响应式

```
sm:, md:, lg:, xl:, 2xl:
md:grid-cols-3, lg:flex, sm:text-lg
```

## 📖 常用组件模式

### 按钮

```jsx
<button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
  按钮
</button>
```

### 卡片

```jsx
<div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
  <h3 className="text-xl font-semibold mb-2">标题</h3>
  <p className="text-gray-600">内容</p>
</div>
```

### 表单输入

```jsx
<input
  type="text"
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

### 网格布局

```jsx
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
  <div>卡片1</div>
  <div>卡片2</div>
  <div>卡片3</div>
</div>
```

## 🔄 迁移现有组件到 Tailwind

### 示例：从 CSS Module 迁移

**原始代码** (LoginPage.jsx 的一部分):

```jsx
// 使用 CSS Module
import styles from "./LoginPage.module.css";

<div className={styles.container}>
  <input className={styles.input} />
</div>;
```

**迁移后** (使用 Tailwind):

```jsx
<div className="flex items-center justify-center min-h-screen bg-gray-100">
  <input className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
</div>
```

## ✨ 最佳实践

### 1. 保持一致性

```jsx
// ✅ 好
<button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
  提交
</button>

// ❌ 避免混乱的类名
<button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-md border-1 border-gray-300">
```

### 2. 提取重复的组件

```jsx
// 创建可复用按钮组件
function PrimaryButton({ children, ...props }) {
  return (
    <button
      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
      {...props}
    >
      {children}
    </button>
  );
}
```

### 3. 使用 @apply 定义可复用的样式（在 CSS 文件中）

```css
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium;
  }

  .card {
    @apply bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow;
  }
}
```

## 🚀 示例文件

已为你创建示例文件：`src/components/TailwindExample.jsx`

你可以查看这个文件了解更多用法，或者在 App.jsx 中导入它来看实时效果。

## 📚 常用 Tailwind 工具

### IntelliSense 支持

安装 VS Code 扩展: "Tailwind CSS IntelliSense" (bradlc.vscode-tailwindcss)

### 文档参考

- 官方文档: https://tailwindcss.com/docs
- 配色方案: https://tailwindcss.com/docs/customizing-colors
- 响应式设计: https://tailwindcss.com/docs/responsive-design

## 🎯 下一步

1. **渐进式迁移**: 不需要一次性迁移所有组件，可以逐步添加 Tailwind 到新组件
2. **混合使用**: 现有的 CSS Module 仍然可以继续使用
3. **自定义主题**: 根据项目需求修改 `tailwind.config.js` 中的颜色、字体等
4. **创建组件库**: 基于 Tailwind 创建可复用的 UI 组件库

---

**注意**: Tailwind CSS 已完全集成，可以直接在任何组件中使用 `className` 属性来应用 Tailwind 类名。
