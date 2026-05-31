# nainu-agi-fe

基于 React + TypeScript + Vite 构建的 AGI 前端应用，提供智能聊天界面和工作流可视化功能。

## ✨ 核心功能

- 🤖 **智能聊天** - 实时消息收发、对话历史管理、对话配置
- 🔄 **工作流可视化** - 拖拽式工作流设计，支持节点连接和配置

## 🛠️ 技术栈

- React 19 + TypeScript
- Vite 6
- Ant Design 6
- React Router 7
- @xyflow/react (工作流)

## 📁 项目结构

```
src/
├── component/
│   ├── agent/       # 聊天模块：聊天界面、消息管理、对话配置
│   ├── layout/      # 布局模块：页面布局、导航组件
│   ├── message/     # 消息状态：全局消息上下文管理
│   └── workflow/    # 工作流模块：节点组件、工作流画布
├── config/          # 配置文件：路由配置
├── pages/           # 页面组件
└── services/        # 服务层：API 封装、工具函数
```

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

## 🔌 API 配置

后端服务地址：`src/services/chat.ts` 中配置 `base_url`

## 📄 许可证

MIT License
