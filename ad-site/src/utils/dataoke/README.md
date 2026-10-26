# Dataoke商品购买链接获取服务模块

## 模块介绍

Dataoke商品购买链接获取服务模块是一个通用型组件，用于获取Dataoke平台商品的购买链接。该模块设计为独立的外包模块，方便其他项目组件进行调用和复用。

## 功能特性

- ✅ 获取单个商品购买链接
- ✅ 批量获取商品购买链接
- ✅ 完整的类型定义（TypeScript）
- ✅ 完善的错误处理
- ✅ 清晰的API接口
- ✅ 易于集成和扩展

## 安装方法

将该模块复制到您的项目中，然后通过相对路径导入使用。

```bash
# 复制模块到您的项目中
cp -r d:\Trae\getPic\dataoke your-project-path/
```

## 使用示例

### 1. 基本使用

```typescript
import { dataokeService } from './dataoke';

// 获取单个商品购买链接
async function getProductLink() {
  const goodsId = '1234567890';
  const result = await dataokeService.getProductBuyUrl(goodsId);
  
  if (result.success) {
    console.log(`商品购买链接：${result.buyUrl}`);
    // 这里可以更新UI，将"查看详情"按钮切换为"立即购买"按钮
  } else {
    console.error(`获取失败：${result.error}`);
  }
}

// 批量获取商品购买链接
async function getBatchProductLinks() {
  const goodsIds = ['1234567890', '0987654321'];
  const results = await dataokeService.batchGetProductBuyUrls(goodsIds);
  
  results.forEach(result => {
    if (result.success) {
      console.log(`商品 ${result.goodsId} 购买链接：${result.buyUrl}`);
    }
  });
}
```

### 2. 在Vue组件中使用

```vue
<template>
  <div class="product-card" @click="handleProductClick(product.goodsId)">
    <img :src="product.mainPic" :alt="product.title" />
    <h4>{{ product.title }}</h4>
    <p>¥{{ product.actualPrice }}</p>
    <button :disabled="loadingStatus[product.goodsId]">
      <i v-if="loadingStatus[product.goodsId]" class="fas fa-spinner fa-spin"></i>
      {{ loadingStatus[product.goodsId] ? '加载中...' : (buyUrls[product.goodsId] ? '立即购买' : '查看详情') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { dataokeService } from './dataoke';

// 商品数据
const product = ref({
  goodsId: '1234567890',
  title: '示例商品',
  mainPic: 'https://example.com/image.jpg',
  actualPrice: 99.9
});

// 商品购买链接映射
const buyUrls = ref<Record<string, string>>({});

// 商品加载状态映射
const loadingStatus = ref<Record<string, boolean>>({});

// 处理商品点击
async function handleProductClick(goodsId: string) {
  // 更新加载状态
  loadingStatus.value[goodsId] = true;
  
  try {
    // 获取商品购买链接
    const result = await dataokeService.getProductBuyUrl(goodsId);
    
    if (result.success) {
      // 更新商品购买链接
      buyUrls.value[goodsId] = result.buyUrl;
    }
  } finally {
    // 更新加载状态
    loadingStatus.value[goodsId] = false;
  }
}
</script>
```

## API文档

### 1. DataokeService类

#### 构造函数

```typescript
new DataokeService()
```

创建DataokeService实例。

#### getProductBuyUrl(goodsId: string)

获取单个商品购买链接。

**参数**：
- `goodsId`：商品ID

**返回值**：
- `Promise<BuyUrlResult>`：购买链接结果对象

**BuyUrlResult结构**：
```typescript
interface BuyUrlResult {
  goodsId: string;      // 商品ID
  buyUrl: string;       // 购买链接
  success: boolean;     // 是否成功
  error?: string;       // 错误信息（仅当success为false时存在）
}
```

#### batchGetProductBuyUrls(goodsIds: string[])

批量获取商品购买链接。

**参数**：
- `goodsIds`：商品ID数组

**返回值**：
- `Promise<BuyUrlResult[]>`：购买链接结果对象数组

### 2. 单例实例

```typescript
export const dataokeService = new DataokeService();
```

模块提供了一个预创建的单例实例，方便直接使用，无需手动创建。

## 类型定义

### DataokeProduct

Dataoke商品数据接口。

```typescript
interface DataokeProduct {
  id: string;
  goodsId: string;
  title: string;
  dtitle: string;
  originalPrice: number;
  actualPrice: number;
  // ... 其他字段
}
```

### DataokeServerResponse

服务器返回数据接口。

```typescript
interface DataokeServerResponse {
  code: number;
  message: string;
  success: boolean;
  data: {
    // ... 服务器返回数据结构
  };
}
```

## 模块结构

```
dataoke/
├── index.ts          # 模块主入口
├── types.ts          # 类型定义
├── service.ts        # 服务层实现
├── example.ts        # 使用示例
└── README.md         # 模块文档
```

## 技术栈

- TypeScript
- Fetch API

## 浏览器兼容性

支持所有现代浏览器，包括：
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 错误处理

该模块包含完善的错误处理机制，能够处理以下情况：
- 网络请求失败
- 服务器返回错误状态码
- 服务器返回数据格式错误
- 其他未知错误

所有错误都会被捕获并返回包含错误信息的结果对象，不会导致程序崩溃。

## 扩展建议

1. **添加缓存机制**：可以添加本地缓存，避免重复请求相同的商品链接
2. **支持配置**：可以添加配置选项，允许自定义API URL、请求超时等
3. **添加日志记录**：可以添加日志记录功能，方便调试和监控
4. **支持更多API**：可以扩展支持Dataoke平台的其他API接口

## 版本历史

- v1.0.0：初始版本，支持获取单个和批量商品购买链接

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎联系开发者。
