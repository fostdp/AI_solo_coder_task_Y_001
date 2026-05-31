# 量子隧穿效应演示实验

一个基于Web的量子隧穿效应可视化演示实验，使用Canvas绘制波包动画，实时求解薛定谔方程。

## 功能特点

- 🎨 **可视化演示**: Canvas实时绘制波函数、势垒和粒子能量
- ⚛️ **薛定谔方程求解**: 使用有限差分法数值求解含时薛定谔方程
- 🎛️ **参数调节**: 可调节势垒高度、势垒宽度、粒子能量和波包初始位置
- 📊 **透射系数计算**: 自动计算并显示透射系数和反射系数
- 💾 **数据持久化**: 后端保存实验参数和结果，支持查看历史记录
- 🎬 **动画控制**: 开始、暂停、重置模拟动画

## 物理原理

量子隧穿是量子力学中的一种现象，粒子能够穿越在经典力学中不可能越过的势垒。这是由于粒子的波粒二象性。

### 透射系数公式

当粒子能量 E < 势垒高度 V₀ 时：
```
T ≈ 16(E/V₀)(1 - E/V₀)exp(-2κa)
其中 κ = √[2m(V₀-E)/ℏ²]
```

当粒子能量 E > 势垒高度 V₀ 时：
```
T = 4k₁k₂ / [(k₁+k₂)²cos²(k₂a) + (k₁k₂+1)²sin²(k₂a)]
```

## 项目结构

```
quantum-tunneling-demo/
├── index.html          # 主页面
├── style.css           # 样式文件
├── app.js              # 前端逻辑和物理引擎
├── server.js           # 后端服务器
├── package.json        # 项目配置
├── experiments.json    # 实验数据存储（自动生成）
└── README.md           # 项目文档
```

## 安装和运行

### 环境要求
- Node.js 14.0 或更高版本

### 安装依赖
```bash
npm install
```

### 启动服务器
```bash
npm start
```

### 访问应用
打开浏览器访问: http://localhost:3000

## 使用说明

1. **调节参数**:
   - 势垒高度 (V₀): 0 - 10 单位
   - 势垒宽度 (a): 0.5 - 5 单位
   - 粒子能量 (E): 0.1 - 10 单位
   - 波包初始位置: -15 - -5 单位

2. **控制模拟**:
   - 点击「开始模拟」按钮运行动画
   - 点击「暂停」按钮暂停动画
   - 点击「重置」按钮重置波包到初始位置

3. **查看结果**:
   - 实时观察波函数 |ψ(x)|² 的传播
   - 查看透射系数和反射系数
   - 观察隧穿概率百分比

4. **保存数据**:
   - 点击「保存实验数据」按钮保存当前参数和结果
   - 查看右侧「实验历史」面板查看最近的实验

## API 接口

### 获取所有实验数据
```
GET /api/experiments
```

### 保存实验数据
```
POST /api/experiments
Content-Type: application/json

{
  "parameters": {
    "barrierHeight": 5.0,
    "barrierWidth": 2.0,
    "particleEnergy": 3.0,
    "wavePosition": -8.0
  },
  "results": {
    "transmissionCoefficient": 0.0456,
    "reflectionCoefficient": 0.9544,
    "transmissionProbability": 4.56
  }
}
```

### 获取统计数据
```
GET /api/experiments/statistics
```

### 删除指定实验数据
```
DELETE /api/experiments/:id
```

## 技术栈

- **前端**: 原生 JavaScript, HTML5 Canvas, CSS3
- **后端**: Node.js, Express.js
- **数据存储**: JSON 文件 (简单持久化)

## 数值方法

使用 **分裂算符法** (Split-Operator Method) 的简化版本求解含时薛定谔方程：

```
iℏ ∂ψ/∂t = (-ℏ²/2m ∇² + V(x)) ψ
```

通过有限差分法离散化空间，使用时间步进法演化波函数。

## 许可证

MIT License
