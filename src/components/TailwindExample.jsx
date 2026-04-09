/**
 * Tailwind CSS 使用示例
 * 该文件展示如何在项目中使用 Tailwind CSS
 * 可以参考这个示例来重构现有组件
 */

export function TailwindExample() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      {/* 容器 */}
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Tailwind CSS 示例
        </h1>
        <p className="text-lg text-gray-600 mb-12">
          在不改变项目结构的情况下使用 Tailwind CSS
        </p>

        {/* 网格布局 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* 卡片1 */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              结构清晰
            </h3>
            <p className="text-gray-600">
              无需改动原有项目结构，直接添加 Tailwind CSS
            </p>
          </div>

          {/* 卡片2 */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              快速开发
            </h3>
            <p className="text-gray-600">使用 Tailwind 类名快速构建界面</p>
          </div>

          {/* 卡片3 */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <span className="text-2xl">🎨</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              样式融合
            </h3>
            <p className="text-gray-600">与 CSS Module 和现有样式完全兼容</p>
          </div>
        </div>

        {/* 按钮示例 */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">常用按钮</h2>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
              主要按钮
            </button>
            <button className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium">
              次要按钮
            </button>
            <button className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium">
              危险按钮
            </button>
            <button className="px-6 py-2 border-2 border-gray-300 text-gray-900 rounded-lg hover:border-gray-400 transition-colors font-medium">
              边框按钮
            </button>
          </div>
        </div>

        {/* 表单示例 */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">表单示例</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                type="text"
                placeholder="输入用户名"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱
              </label>
              <input
                type="email"
                placeholder="输入邮箱"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="w-full px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
              提交
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TailwindExample;
