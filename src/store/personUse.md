项目路由结构
App.jsx 定义了完整的页面路由：

/auth → LoginPage
/ → HomePage
/homework → HomeworkPage
/ware/home/\* → WarePage
/organization → OrganizationPage
/error → ErrorPage

- → ErrorPage（404）
  其中 /, /homework, /ware/home/\*, /organization 都被 PrivateRoute 保护，未登录用户会被重定向到 /auth。

认证与账号类型
认证逻辑
authStore.js 管理登录状态：

token 存于 localStorage
decodeToken() 解析 JWT，提取 sub 和 roles
fetchDetailInfo() 请求 /detailInfo，获取用户所属的学校/班级上下文
switchContext(type, id) 切换当前身份上下文，并跳回首页
账号角色
authStore 支持的角色判断：

isAdmin()：JWT roles 包含 ROLE_ADMIN
isPrincipal()：当前上下文 role === 'ROLE_PRINCIPAL'
isTeacher()：当前上下文 role === 'ROLE_TEACHER'
isStudent()：当前上下文 role === 'ROLE_STUDENT'
上下文方式
当前用户可能有多个身份上下文：

activeType = school 或 class
activeId 对应 schoolId 或 classId
Header 中有身份切换器，可在“学校空间 / 班级空间”间切换。

登录与跳转
LoginPage.jsx：

提交用户名/密码到 authApi.post('/login')
登录成功后：
保存 token
解析 token
请求用户详情
navigate(config.front_HOME_PAGE_URL)，默认跳到 /
所以登录后默认进入首页 HomePage。

每个页面作用与跳转逻辑
HomePage
作用：平台首页 / 着陆页

展示时间线/动态内容
点击某些卡片后会跳转到课程仓库：/ware/home/<location>
主要是导航入口，不涉及复杂权限分支
HomeworkPage
作用：作业区，按角色渲染不同仪表盘

角色视图：

Admin / Principal
渲染 AdminDashboard
管理作业、查看所有作业、批改、讨论
Teacher
渲染 TeacherDashboard
创建作业、查看提交、批改
Student
渲染 StudentDashboard
查看作业列表、查看作业详情、提交作业
内部跳转：

该页面使用“Hash 路由”实现内部视图切换
#/ → 作业列表
#/homework/create → 新建/编辑作业
#/homework/{id} → 学生查看某个作业
#/homework/{id}/submissions → 教师查看某作业提交列表
#/submission/{id} → 批改某次提交
WarePage
作用：课程资源仓库 / 文件浏览器

路径由 URL 决定，基于 /ware/home/\*
当前页面会把 location.pathname 去掉 /ware/home 后作为文件夹路径
例如：
/ware/home/ → 根目录
/ware/home/docs → docs 文件夹
/ware/home/course/lesson1 → 对应子目录
权限差异：

Admin / Principal / Teacher 在仓库中一般有更多操作权限（例如新建目录/文件）
具体操作权限由组件和后端控制，当前组件中 WareHeader 的 isTeacher={isTeacher || isAdmin || isPrincipal} 表明这三类用户有写权限入口
OrganizationPage
作用：组织管理页面

管理员和校长看到 AdminView
普通成员（教师/学生）看到 MemberView
组织管理页面与当前上下文密切相关
若当前身份是学校上下文且是校长，可对学校层级进行管理
若当前身份是班级上下文，则可查看班级信息
ErrorPage
作用：异常页与 404 页面

/error 用于通用错误

- 通过 ErrorPage code="404" 渲染 404
  账号实际跳转结论
  未登录用户
  访问 /、/homework、/ware/home/\*、/organization 时
  由 PrivateRoute 直接跳转到 /auth
  登录后初始跳转
  登录成功统一跳到 /
  登录后可访问页面
  HomePage：所有登录用户
  HomeworkPage：所有登录用户，但显示不同角色仪表盘
  WarePage：所有登录用户
  OrganizationPage
  Admin/Principal → AdminView
  其他成员 → MemberView
  关键角色判断点
  ROLE_ADMIN：系统管理员身份
  ROLE_PRINCIPAL：校长身份
  ROLE_TEACHER：教师身份
  ROLE_STUDENT：学生身份
  结论
  这个项目主要是一个教学管理系统：

/auth 负责登录
/ 是首页入口
/homework 是作业管理，按角色展示不同内容
/ware/home/\* 是教学资源仓库
/organization 是组织与成员管理
账号类型与对应页面行为：

Admin：可访问作业管理、组织管理、仓库管理
Principal：类似管理员，组织管理范围在学校层级
Teacher：主要是作业出题、批改、班级教学资源
Student：主要是查看/提交作业、访问资源仓库、查看班级信息
如果你需要，我可以继续帮你画一张“路由与角色跳转关系图”。
