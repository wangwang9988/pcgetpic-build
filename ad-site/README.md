# ad-site 独立项目说明

本项目是专为 `iframe` 嵌入设计的独立 Vue 3 项目，用于展示不同类型的商品推荐列表。它的核心设计思想是：**对外提供固定的 URL 链接，对内通过代码逻辑灵活切换展示内容。**

## 核心设计方案：固定链接与内容切换

### 1. 访问原理
项目采用单页面架构，通过 URL 查询参数 `rankType` 来控制展示的推荐内容。
- **参数解析**: 在 [App.vue](file:///d:/Trae/PcGetPic/ad-site/src/App.vue) 中，逻辑会从浏览器地址栏获取 `rankType` 的值。
- **地址示例**: 如果你的服务器地址是 `https://addp.yueding168.com/`，那么访问 `https://addp.yueding168.com/?rankType=1` 就会加载实时榜单。

## 内容切换方案 (池化管理)

为了方便管理固定链接，项目采用了“配置池 + 映射表”的设计。你可以随意让链接 `1-8` 指向任何数据源。

### 1. 资源配置池 (内部编号)
对应代码中的 `RANK_POOL`（配置在 [`src/config/rankConfig.ts`](file:///d:/Trae/PcGetPic/ad-site/src/config/rankConfig.ts)），这里定义了所有可用的数据源：

| 编号 | 页面名称 | 后端 API 地址 | 关键请求参数 |
| :--- | :--- | :--- | :--- |
| **A** | 实时榜 | `https://search.cpscpc.com/ranking-list` | `rankType: 1` |
| **B** | 全天榜 | `https://search.cpscpc.com/ranking-list` | `rankType: 2` |
| **C** | 热推榜 | `https://search.cpscpc.com/ranking-list` | `rankType: 3` |
| **D** | 9.9包邮 | `https://search.cpscpc.com/nine-op-goods-list` | `nineCid: -1` |
| **E** | 今日推荐 | `https://search.cpscpc.com/high-commission-goods-list` | `pageId: 1` |
| **F** | 历史榜单 | `https://search.cpscpc.com/haodanku/current-commission` | `cat_id: 0` |
| **G** | 历史推荐 | `https://search.cpscpc.com/haodanku/high-items` | `cat_id: 0` |
| **H** | 精选专区 | `https://search.cpscpc.com/low-price-pinkage-data` | `type: 1` |
| **I** | 静态海报 | 图片链接 | 点击跳转 |
| **J** | 今日值得买 | `https://search.cpscpc.com/deserve_item` | - |
| **K** | 每日低价 | `https://search.cpscpc.com/half-price-day` | `sessions: 1` |
| **L** | StarBook海报 | `//img.alicdn.com/imgextra/i2/1916442654/O1CN01DG8ore1VTaI9riY4H_!!1916442654.png` | 点击跳转 starbook.ai |

### 2. 固定链接映射关系
对应代码中的 `RANK_MAPPING`（配置在 [`src/config/rankConfig.ts`](file:///d:/Trae/PcGetPic/ad-site/src/config/rankConfig.ts)）。目前默认的映射关系如下：

| 对外固定 ID | 对应池编号 | 实际展示内容 |
| :--- | :--- | :--- |
| **1** | **A** | 实时榜 |
| **2** | **L** | StarBook海报（临时，后期改回 **G** 历史推荐） |
| **3** | **C** | 热推榜 |
| **4** | **D** | 9.9包邮 |
| **5** | **E** | 今日推荐 |
| **6** | **F** | 历史榜单 |
| **7** | **G** | 历史推荐 |
| **8** | **H** | 精选专区 |
| **eA** | **A** | 实时榜 |
| **eB** | **B** | 全天榜 |
| **eC** | **C** | 热推榜 |
| **eD** | **D** | 9.9包邮 |
| **eE** | **E** | 今日推荐 |
| **eF** | **F** | 历史榜单 |
| **eG** | **G** | 历史推荐 |
| **eH** | **H** | 精选专区 |
| **eI** | **I** | 静态海报 |
| **eJ** | **J** | 今日值得买 |
| **eK** | **K** | 每日低价 |
| **eL** | **L** | StarBook海报 |

### 3. 如何操作 (维护手册)

项目的配置逻辑完全解耦，你可以根据不同需求进行操作：

#### 场景 A：只想切换现有内容 (最常用)
如果你想把对外提供的链接 `?rankType=1` 的内容从“实时榜”换成“9.9包邮”：
1. 打开 [rankConfig.ts](file:///d:/Trae/PcGetPic/ad-site/src/config/rankConfig.ts)
2. 找到 `RANK_MAPPING` 常量。
3. 将 `1: 'A'` 修改为 `1: 'D'` (D 代表 9.9 包邮)。
4. **保存并重新打包** 即可。

#### 场景 B：增加了一个全新的后端接口
如果你后期开发了第 9 个接口，想让某个广告位展示它：
1. 在 `RANK_POOL` 中添加一个新成员，分配新字母（如 `'I'`）：
   ```typescript
   'I': {
       name: '新款上线',
       description: '描述内容...',
       apiUrl: 'https://api.your-server.com/new-api',
       method: 'POST',
       params: { ... }
   }
   ```
2. 在 `RANK_MAPPING` 中修改映射，比如让 ID 8 指向它：`8: 'I'`。
3. **保存并重新打包** 即可。

#### 注意：插件端 rankType 分布
为了方便你维护，这里记录了插件 (`getPic`) 中各页面的展示规律：
*   **主图页面**：加载 `rankType=1` 和 `rankType=2`
*   **SKU/配图页面**：加载 `rankType=3` 和 `rankType=4`
*   **详情图页面**：加载 `rankType=5` 和 `rankType=6`
*   **视频页面**：加载 `rankType=7` 和 `rankType=8`

## 本地开发与调试

在本地环境下开发时，你可以通过以下链接进入管理/调试模式：

- **本地链接**: [http://localhost:5188/?mode=docs](http://localhost:5188/?mode=docs)
- **线上地址**: [https://addp.yueding168.com/?mode=docs](https://addp.yueding168.com/?mode=docs)
- **说明**: `mode=docs` 参数会显示开发者看板，方便动态调整参数和预览效果。

## 部署与集成

### 服务器地址
- **正式地址**: `https://addp.yueding168.com/`
- **调用方式**: `https://addp.yueding168.com/?rankType=1`

### iframe 集成示例
```html
<iframe 
  src="https://addp.yueding168.com/?rankType=1" 
  width="225" 
  height="300" 
  frameborder="0"
></iframe>
```

---
**注意**：本项目已移除国际化逻辑，所有 UI 文案均为硬编码中文。

## 打包与发布

如果你需要将项目部署到服务器（如 `https://addp.yueding168.com/`），请按照以下步骤操作：

1. **进入项目目录**:
   ```bash
   cd ad-site
   ```

2. **执行打包命令**:
   ```bash
   npm run build
   ```

3. **部署产物**:
   打包完成后，项目根目录下会生成一个 `dist` 文件夹。你只需要将 `dist` 文件夹内的所有文件上传到服务器的 Web 根目录即可。
