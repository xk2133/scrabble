# 🦉 Scrabble 英语棋

英语单词拼写对战游戏，基于 Scrabble 规则。React 18 + TypeScript + Vite 5 构建。

## ✨ 特性

- **🎮 双重对战模式**：快速对战（60字母 · 150分获胜）和标准对战（100字母 · 经典规则）
- **🤖 AI 对战**：简单（贪心算法）和中等（Minimax + Alpha-Beta 剪枝）两种难度
- **📖 词典验证**：Trie 数据结构 + ENABLE 词典（7062 单词）
- **🎨 Claymorphism 设计**：粘土拟态风格，响应式布局
- **🌐 多人对战**：WebSocket 实时对战支持
- **📝 单词本**：收藏单词，搜索排序，释义发音
- **📱 全适配**：PC / 平板 / 手机

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 🎯 玩法

1. 在 15×15 棋盘上放置字母块，拼出有效的英语单词
2. 单词必须从左到右或从上到下排列
3. 首个单词必须经过中心星格（★）
4. 利用 DL/TL/DW/TW 特殊格子获得倍率加成
5. 一次用完 7 个字母获得额外 50 分宾果奖励

## 📂 项目结构

```
scrabble/
├── src/
│   ├── components/    # UI 组件
│   ├── pages/         # 页面
│   ├── context/       # React Context
│   ├── engine/        # 游戏引擎 & AI
│   ├── hooks/         # 自定义 Hooks
│   ├── services/      # 服务层
│   ├── constants/     # 常量配置
│   ├── types/         # TypeScript 类型
│   └── styles/        # 全局样式
├── scrabble-server/   # WebSocket 服务器
├── public/            # 静态资源
└── dist/              # 构建产物
```

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 路由 | React Router v6 |
| 通信 | Socket.IO |
| 样式 | CSS Modules + CSS Custom Properties |
| AI | 贪心 + MinMax + Alpha-Beta 剪枝 |
| 词典 | Trie 前缀树 |

## 📄 许可

MIT License
