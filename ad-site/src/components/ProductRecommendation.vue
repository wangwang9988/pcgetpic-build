<template>
  <div class="recommendation-card-wrapper" :style="{ width: props.width, height: props.height }">
    <!-- 加载中状态 -->
    <div v-if="isLoading" class="status-container">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 纯图片模式 -->
    <div v-else-if="currentConfig?.contentType === 'image'" class="image-mode-container" @click="handleImageClick">
      <img :src="currentConfig.apiUrl" class="poster-image" referrerpolicy="no-referrer" />
    </div>

    <!-- 纯HTML宣传模式 -->
    <div v-else-if="currentConfig?.contentType === 'html'" class="html-mode-container" @click="handleImageClick">
      <KefuPromo />
    </div>

    <!-- iframe嵌入模式 -->
    <div v-else-if="currentConfig?.contentType === 'iframe'" class="iframe-mode-container">
      <iframe
        :src="currentConfig.apiUrl"
        class="embed-iframe"
        frameborder="0"
        scrolling="auto"
        allowfullscreen
      ></iframe>
      <!-- 当配置了 linkUrl 时，添加透明遮罩层捕获点击 -->
      <div
        v-if="currentConfig.linkUrl"
        class="iframe-click-overlay"
        @click="handleIframeClick"
      ></div>
    </div>

    <!-- 无数据状态 -->
    <div v-else-if="products.length === 0" class="status-container">
      <span>暂无数据</span>
      <button 
        v-if="showRetryButton" 
        class="retry-button" 
        @click="handleManualRetry"
      >
        手动重试
      </button>
    </div>

    <!-- 商品列表 -->
    <div v-else class="rank-list custom-scrollbar">
      <div 
        v-for="product in products" 
        :key="product.id" 
        class="rank-item" 
        @click="handleProductClick(product)"
        @mouseenter="handleProductHover(product, $event)"
        @mousemove="handleProductHover(product, $event)"
        @mouseleave="handleProductHoverEnd"
      >
        <div class="item-visual">
          <img :src="product.image" :alt="product.name" loading="lazy" referrerpolicy="no-referrer" />
        </div>
        
        <div class="item-info">
          <div class="item-title" :title="product.name">{{ product.name }}</div>
          <div class="item-bottom">
            <span class="item-price">¥{{ product.price }}</span>
            <span class="item-sales">销量 {{ formatSales(product.sales) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 商品详情模态框 (内部兜底) -->
    <ItemsProductModal
      v-if="modalVisible"
      :visible="modalVisible"
      :product="currentProduct"
      :loading="isModalLoading"
      :buy-url="buyUrl"
      :has-tpwd="hasTpwd"
      :short-url="shortUrl"
      :item-url="itemUrl"
      @close="closeModal"
      @buy="handleModalBuy"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, defineAsyncComponent } from 'vue';
const ItemsProductModal = defineAsyncComponent(() => import('@/components/items/ItemsProductModal.vue'));
const KefuPromo = defineAsyncComponent(() => import('./KefuPromo.vue'));
import { RANK_LIST_CONFIG } from '../config/rankConfig';
import { ensureRemoteRankMapping, isNumericRankSlot, rankMappingVersion } from '@/utils/remoteRankMapping';
import { dataokeService } from "@/utils/dataoke";
import { getRankData, type RankRawItem } from '@/utils/rankDataClient';


const props = withDefaults(defineProps<{
  rankType: number | string;
  width?: string;
  height?: string;
}>(), {
  width: '225px',
  height: '300px'
});

const currentConfig = computed(() => {
  void rankMappingVersion.value;
  return RANK_LIST_CONFIG[props.rankType];
});

const isIframe = window.self !== window.top;

// 定义本地使用的产品接口
interface Product {
  id: string;
  goodsId: string;
  name: string;
  price: number;
  originalPrice: number | string;
  sales: number;
  image: string;
  rank: number;
  raw: RankRawItem; // 保存点击详情所需的原始数据
}

const products = ref<Product[]>([]);
const isLoading = ref(true);

// 格式化销量
const formatSales = (sales: number): string => {
  if (sales >= 10000) {
    return `${(sales / 10000).toFixed(1)}万`; 
  }
  return sales.toString();
};

// 模态框相关状态
const modalVisible = ref(false);
const currentProduct = ref<any>(null);
const isModalLoading = ref(false);
const buyUrl = ref("");
const hasTpwd = ref(true);
const shortUrl = ref("");
const itemUrl = ref("");

const showRetryButton = ref(false);
let lastRetryTime = 0; // 用于手动重试的节流
let requestSequence = 0;
let activeRequestController: AbortController | null = null;

const firstItemValue = (item: RankRawItem, keys: string[]): unknown => {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const toFiniteNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapProducts = (items: RankRawItem[], rankType: number | string): Product[] => (
  items.map((item, index) => {
    const goodsId = firstItemValue(item, ['goodsId', 'itemid', 'id']);
    return {
      id: `rank-${rankType}-${String(goodsId ?? index)}`,
      goodsId: String(goodsId ?? ''),
      name: String(firstItemValue(item, ['dtitle', 'itemshorttitle', 'title', 'itemtitle']) ?? '未知商品'),
      price: toFiniteNumber(firstItemValue(item, ['actualPrice', 'itemendprice', 'price'])),
      originalPrice: String(firstItemValue(item, ['originalPrice', 'itemprice', 'marketPrice']) ?? ''),
      sales: Math.trunc(toFiniteNumber(firstItemValue(item, ['monthSales', 'itemsale', 'sales']))),
      image: String(firstItemValue(item, ['mainPic', 'itempic', 'img']) ?? ''),
      rank: index + 1,
      raw: item,
    };
  })
);

const stopActiveRequest = () => {
  activeRequestController?.abort();
  activeRequestController = null;
};

// 获取排行榜数据
const fetchRankingData = async (forceRefresh = false) => {
  const sequence = ++requestSequence;
  stopActiveRequest();

  if (isNumericRankSlot(props.rankType)) {
    await ensureRemoteRankMapping();
    if (sequence !== requestSequence) return;
  }

  const config = currentConfig.value;
  if (!config) {
    products.value = [];
    isLoading.value = false;
    showRetryButton.value = false;
    return;
  }

  // 如果是图片模式或HTML模式，直接停止加载，显示对应内容
  if (config.contentType === 'image' || config.contentType === 'html') {
    isLoading.value = false;
    products.value = [];
    showRetryButton.value = false;
    return;
  }

  // 如果是iframe模式，直接停止加载，显示iframe
  if (config.contentType === 'iframe') {
    isLoading.value = false;
    products.value = [];
    showRetryButton.value = false;
    return;
  }

  products.value = [];
  isLoading.value = true;
  showRetryButton.value = false;
  const controller = new AbortController();
  activeRequestController = controller;
  const rankType = props.rankType;

  try {
    const result = await getRankData(config, {
      signal: controller.signal,
      forceRefresh,
    });
    if (controller.signal.aborted || sequence !== requestSequence) return;

    products.value = mapProducts(result.items, rankType);
    isLoading.value = false;
    showRetryButton.value = false;

    if (result.refresh) {
      void result.refresh.then((items) => {
        if (!items || controller.signal.aborted || sequence !== requestSequence) return;
        products.value = mapProducts(items, rankType);
      }).finally(() => {
        if (sequence === requestSequence && activeRequestController === controller) {
          activeRequestController = null;
        }
      });
      return;
    }

    if (activeRequestController === controller) activeRequestController = null;
  } catch {
    if (controller.signal.aborted || sequence !== requestSequence) return;
    products.value = [];
    isLoading.value = false;
    showRetryButton.value = true;
    if (activeRequestController === controller) activeRequestController = null;
  }
};

// 手动重试处理（2秒节流）
const handleManualRetry = () => {
  const now = Date.now();
  if (now - lastRetryTime < 2000) return;
  lastRetryTime = now;
  void fetchRankingData(true);
};

// 鼠标悬停商品：通过 postMessage 通知父窗口显示大图预览
// mouseenter 立即发送；mousemove 同时满足移动距离和 100ms 间隔才更新。
let lastHoverTime = 0;
let lastHoverPosition: { imageUrl: string; x: number; y: number } | null = null;
let hoverPreviewActive = false;
const HOVER_THROTTLE_MS = 100;
const HOVER_MIN_DISTANCE_PX = 8;

const handleProductHover = (product: Product, event: MouseEvent) => {
  if (!isIframe) return;
  const now = Date.now();
  if (event.type === 'mousemove') {
    if (now - lastHoverTime < HOVER_THROTTLE_MS) return;
    if (lastHoverPosition?.imageUrl === product.image) {
      const deltaX = event.clientX - lastHoverPosition.x;
      const deltaY = event.clientY - lastHoverPosition.y;
      if ((deltaX * deltaX) + (deltaY * deltaY) < HOVER_MIN_DISTANCE_PX ** 2) return;
    }
  }

  lastHoverTime = now;
  lastHoverPosition = { imageUrl: product.image, x: event.clientX, y: event.clientY };
  hoverPreviewActive = true;
  window.parent.postMessage({
    type: 'RANK_HOVER_PREVIEW',
    imageUrl: product.image,
    productName: product.name,
    mouseX: event.clientX,
    mouseY: event.clientY,
  }, '*');
};

// 鼠标离开商品：通知父窗口隐藏大图预览
const handleProductHoverEnd = () => {
  if (!isIframe || !hoverPreviewActive) return;
  hoverPreviewActive = false;
  lastHoverPosition = null;
  window.parent.postMessage({
    type: 'RANK_HOVER_PREVIEW_END',
  }, '*');
};

// 点击图片处理
const handleImageClick = () => {
    if (currentConfig.value?.linkUrl) {
        window.open(currentConfig.value.linkUrl, '_blank');
    }
};

// 点击 iframe 遮罩层处理
const handleIframeClick = () => {
    if (currentConfig.value?.linkUrl) {
        window.open(currentConfig.value.linkUrl, '_blank');
    }
};

// 点击商品处理
const handleProductClick = async (product: Product) => {
  // 发送消息给父窗口
  if (isIframe) {
    window.parent.postMessage({
      type: 'OPEN_PRODUCT_DETAIL',
      product: JSON.parse(JSON.stringify(product.raw))
    }, '*');
    return;
  }

  currentProduct.value = {
     ...product.raw,
     goodsId: product.goodsId,
     dtitle: product.name,
     actualPrice: product.price,
     monthSales: product.sales,
     mainPic: product.image
  };
  
  modalVisible.value = true;
  isModalLoading.value = true;
  
  try {
    const result = await dataokeService.getProductBuyUrl(product.goodsId);
    if (result.success) {
      buyUrl.value = result.buyUrl;
      hasTpwd.value = result.hasTpwd;
      shortUrl.value = result.shortUrl;
      itemUrl.value = result.itemUrl || "";
      if (result.longTpwd) {
        currentProduct.value = { ...currentProduct.value, longTpwd: result.longTpwd };
      }
    }
  } catch (err) {
    console.error(`[ProductRecommendation] Error getting buy url:`, err);
  } finally {
    isModalLoading.value = false;
  }
};

const closeModal = () => { modalVisible.value = false; };
const handleModalBuy = () => { if (buyUrl.value) window.open(buyUrl.value, '_blank'); };

watch(() => props.rankType, () => {
  void fetchRankingData();
});

onMounted(() => {
  void fetchRankingData();
});

onBeforeUnmount(() => {
  requestSequence += 1;
  stopActiveRequest();
});
</script>

<style scoped>
/* 容器样式 */
.recommendation-card-wrapper {
  display: flex !important;
  flex-direction: column;
  width: 100%; /* 改为自适应宽度 */
  height: 100%; /* 改为自适应高度 */
  padding: 0 !important;
  background: white;
  overflow-x: hidden; /* 隐藏水平滚动条 */
  overflow-y: auto; /* 允许纵向滚动 */
  box-sizing: border-box;
}

/* 列表区域 */
.rank-list {
  flex: 1;
  overflow-y: auto; /* 纵向滚动 */
  overflow-x: hidden; /* 禁止水平滚动 */
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
}

/* 细细的滚动条样式 - 始终可见 */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05); /* 轻微的轨道背景 */
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15); /* 始终可见的滚动条 */
  border-radius: 4px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.25); /* 悬停时更深一点 */
}

/* 单个条目 */
.rank-item {
  display: flex;
  align-items: center;
  padding: 8px 6px; /* 减小左右内边距以适应窄屏 */
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  height: auto; /* 允许自适应高度 */
  min-height: 75px;
  transition: background-color 0.2s;
  box-sizing: border-box;
}

.rank-item:hover {
  background-color: #fafafa;
}

.rank-item:last-child {
  border-bottom: none;
}

/* 缩略图 */
.item-visual {
  width: 50px; 
  height: 50px;
  background: #f7f7f7;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 8px; 
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 信息区域 */
.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 50px; 
  min-width: 0; 
}

.item-title {
  font-size: 12px;
  color: #333;
  line-height: 1.3;
  height: 32px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 4px;
}

/* .item-bottom 和 .item-sales 的样式统一在下方定义 */

.item-price {
  font-size: 13px;
  color: #ff4400;
  font-weight: bold;
  flex-shrink: 0;
}

/* 
 * 窄屏适配 (直接应用，不使用媒体查询)
 * 原因：组件主要在 iframe 中使用，媒体查询判断的是浏览器视口宽度而非 iframe 宽度，
 *       导致 @media (max-width: 240px) 永远不会在宽屏浏览器中生效。
 *       因此直接将窄屏样式作为默认样式。
 */

/* 单个条目 - 添加相对定位用于销量绝对定位 */
.rank-item {
  position: relative;
  overflow: hidden; /* 防止内容溢出 */
}

/* 底部区域 - flex布局，为销量预留空间 */
.item-bottom {
  display: flex;
  justify-content: flex-start; /* 左对齐价格 */
  align-items: center;
  width: 100%;
  min-height: 18px;
  padding-right: 65px; /* 为绝对定位的销量预留空间 */
  box-sizing: border-box;
}

/* 销量 - 使用绝对定位固定在条目右下角 */
.item-sales {
  position: absolute !important;
  right: 6px !important;
  bottom: 8px !important;
  margin: 0 !important;
  font-size: 10px;
  color: #909399;
  background: rgba(255, 255, 255, 0.95);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
  z-index: 1;
}

/* 状态容器 */
.status-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: white;
  color: #909399;
  font-size: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e4e7ed;
  border-top-color: #ff4400;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

.retry-button {
  margin-top: 12px;
  padding: 6px 16px;
  background-color: #ff4400;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #e63d00;
}

.retry-button:active {
  background-color: #cc3600;
}

/* 纯图片模式容器 */
.image-mode-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  background-color: #f7f7f7; /* 图片未撑满时的背景色 */
}

.poster-image {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 改为 contain 以确保图片内容完整显示，不被剪裁 */
  display: block;
}

/* 纯HTML宣传模式容器 */
.html-mode-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
}

/* iframe嵌入模式容器 */
.iframe-mode-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* iframe 点击遮罩层：当配置了 linkUrl 时覆盖在 iframe 上方捕获点击 */
.iframe-click-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  cursor: pointer;
}

.embed-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
