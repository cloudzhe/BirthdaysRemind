# 生日提醒应用

这是一个简单的生日提醒应用程序，使用React、TypeScript和Vite构建。

## 功能

- 添加和管理生日信息
- 自动计算距离下一个生日的天数
- 提供生日提醒功能
- 支持标签分类
- 响应式设计，适配不同设备

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- date-fns (日期处理)
- lucide-react (图标)

## 安装和运行

1. 克隆仓库:
   ```
   git clone <仓库地址>
   ```

2. 安装依赖:
   ```
   npm install
   ```

3. 启动开发服务器:
   ```
   npm run dev
   ```

4. 构建生产版本:
   ```
   npm run build
   ```

## 使用说明

- 在应用中添加生日信息，包括姓名和生日日期
- 可以为每个生日添加标签进行分类
- 应用会自动计算距离下一个生日的天数
- 当生日临近时（5天、3天、1天前），会显示提醒

## 项目结构

```
src/
├── components/
├── data/
├── App.tsx
└── main.tsx
```

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT
