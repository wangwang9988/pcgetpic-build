<template>
  <!-- 模态框背景 -->
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 z-[1001]" @click="handleClose">
    <div class="flex items-center justify-center min-h-screen p-4">
      <!-- 模态框内容 -->
      <div class="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
        <!-- 头部 -->
        <div class="flex items-start justify-between px-4 py-2 border-b border-border-light">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-text-primary">
              {{ normalizedProduct?.dtitle }}
            </h3>
            <p class="text-sm text-text-secondary mt-1">{{ normalizedProduct?.title }}</p>
            <div class="flex items-center mt-2 flex-wrap gap-2">
              <span v-if="normalizedProduct?.brandName" class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {{ normalizedProduct?.brandName }}
              </span>
              <span v-for="(tag, index) in normalizedProduct?.specialText" :key="index"
                class="text-xs bg-success/10 text-success px-2 py-1 rounded-full">
                {{ tag }}
              </span>
            </div>
          </div>
          <button class="text-text-secondary hover:text-text-primary ml-4 flex-shrink-0" @click="handleClose">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- 内容 -->
        <div class="px-4 py-3">
          <!-- 上部布局：调整为65%:35%比例 -->
          <div class="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-3">
            <!-- 左侧图片区域 -->
            <div class="space-y-1">
              <component :is="buyUrl ? 'a' : 'div'" :href="buyUrl || undefined" :target="buyUrl ? '_blank' : undefined"
                class="block rounded-lg overflow-hidden aspect-square bg-white product-link"
                :class="{ 'cursor-pointer': buyUrl }">
                <div class="relative w-full h-full">
                  <img :src="modalImageSrc" :alt="normalizedProduct?.title"
                    class="w-full h-full object-cover rounded-md hover:shadow-lg transition-all duration-300"
                    @error="handleModalImageError" @load="handleModalImageLoad" />
                  
                  <!-- 重试中覆盖层 -->
                  <div v-if="isModalImageRetrying" class="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-md">
                    <div class="modal-loading-spinner"></div>
                    <span class="text-white text-xs mt-2">重试中...</span>
                  </div>
                  
                  <!-- 失败覆盖层 -->
                  <div v-if="isModalImageError" class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-md">
                    <span class="text-white text-sm mb-2">加载失败</span>
                    <button class="px-4 py-1.5 bg-primary text-white text-xs rounded-md" @click.stop="manualRetryModalImage">重试</button>
                  </div>
                </div>
              </component>
            </div>

            <!-- 右侧核心信息区域 -->
            <div class="space-y-2">
              <!-- 价格信息 -->
              <div class="bg-gradient-to-r from-primary/5 to-primary/10 p-3 rounded-lg">
                <div class="flex items-baseline space-x-2">
                  <span class="text-2xl font-bold text-danger">¥{{ normalizedProduct?.actualPrice }}</span>
                  <span class="text-lg text-text-secondary line-through">¥{{ normalizedProduct?.originalPrice }}</span>
                  <span class="bg-danger/90 text-white text-sm px-2 py-1 rounded-full">
                    {{ (((normalizedProduct?.actualPrice || 0) / (normalizedProduct?.originalPrice || 1)) * 10).toFixed(1) }}折
                  </span>
                </div>
              </div>

              <!-- 优惠券信息 -->
              <div v-if="
                normalizedProduct?.couponPrice &&
                normalizedProduct?.couponPrice > 0 &&
                normalizedProduct?.couponLink &&
                normalizedProduct?.couponLink.trim()
              " class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all duration-300 hover:bg-yellow-100"
                @click="handleCouponClick">
                <div class="flex items-center space-x-2">
                  <i class="fas fa-ticket-alt text-yellow-600 text-lg"></i>
                  <h4 class="font-medium text-text-primary">优惠券信息</h4>
                  <i class="fas fa-external-link-alt text-yellow-600 text-sm ml-auto"></i>
                </div>
                <div class="mt-2">
                  <div class="flex items-center space-x-4 flex-wrap">
                    <div class="flex items-baseline">
                      <span class="text-xl font-bold text-yellow-600">¥{{ normalizedProduct?.couponPrice }}</span>
                      <span class="text-sm text-text-secondary ml-1">优惠券</span>
                    </div>
                    <span class="text-sm text-text-primary">满{{ normalizedProduct?.couponConditions }}元可用</span>
                    <span class="text-xs text-text-secondary ml-1 ml-auto">剩余{{ normalizedProduct?.couponRemainCount }}张</span>
                  </div>
                </div>
              </div>

              <!-- 销量信息 -->
              <div class="bg-gray-50 rounded-lg p-3">
                <div class="grid grid-cols-3 gap-2">
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-calendar-alt text-primary text-sm"></i>
                    <span class="text-sm text-text-secondary">月销量</span>
                    <span class="text-lg font-bold text-text-primary ml-auto">{{
                      formatSales(normalizedProduct?.monthSales || 0)
                    }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-clock text-primary text-sm"></i>
                    <span class="text-sm text-text-secondary">日销量</span>
                    <span class="text-lg font-bold text-text-primary ml-auto">{{
                      normalizedProduct?.dailySales || 0
                    }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-bolt text-primary text-sm"></i>
                    <span class="text-sm text-text-secondary">2小时销量</span>
                    <span class="text-lg font-bold text-text-primary ml-auto">{{
                      normalizedProduct?.twoHoursSales || 0
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- 活动信息 -->
              <div v-if="normalizedProduct?.activityInfo && normalizedProduct.activityInfo.length > 0" class="bg-gray-50 rounded-lg p-3">
                <div class="flex flex-wrap gap-2">
                  <span v-for="(activity, index) in normalizedProduct.activityInfo" :key="index"
                    class="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                    {{ activity.activityName }}
                  </span>
                </div>
              </div>

              <!-- 店铺信息 -->
              <div class="bg-gray-50 rounded-lg p-3">
                <div class="space-y-2">
                  <p><strong>店铺名称：</strong>{{ normalizedProduct?.shopName }}</p>
                </div>
              </div>

              <!-- 评分信息 -->
              <div class="bg-gray-50 rounded-lg p-3">
                <div class="space-y-1">
                  <div class="flex items-center">
                    <span class="text-text-primary">综合评分：</span>
                    <span class="text-primary font-medium">{{
                      normalizedProduct?.dsrScore
                    }}</span>
                    <span class="text-xs text-text-secondary ml-1">(综合)</span>
                  </div>
                  <div class="flex items-center">
                    <span class="text-text-primary">描述相符：</span>
                    <span class="text-primary">{{ normalizedProduct?.descScore }}</span>
                    <span class="text-xs text-text-secondary ml-1">(商品与描述的匹配程度)</span>
                  </div>
                  <div class="flex items-center">
                    <span class="text-text-primary">物流服务：</span>
                    <span class="text-primary">{{ normalizedProduct?.shipScore }}</span>
                    <span class="text-xs text-text-secondary ml-1">(物流速度和服务)</span>
                  </div>
                  <div class="flex items-center">
                    <span class="text-text-primary">服务态度：</span>
                    <span class="text-primary">{{
                      normalizedProduct?.serviceScore
                    }}</span>
                    <span class="text-xs text-text-secondary ml-1">(客服响应和服务质量)</span>
                  </div>
                </div>
              </div>

              <!-- 商品描述 -->
              <component :is="buyUrl ? 'a' : 'div'" :href="buyUrl || undefined" :target="buyUrl ? '_blank' : undefined"
                class="block bg-gray-50 rounded-lg p-3 product-link"
                :class="{ 'cursor-pointer': buyUrl }">
                <p class="text-text-secondary leading-relaxed text-sm">
                  {{ normalizedProduct?.desc }}
                </p>
              </component>
            </div>
          </div>

          <!-- 底部操作按钮区域 - flex 自适应布局 -->
          <div class="mt-3 flex gap-2">
            <!-- 售罄状态 -->
            <template v-if="soldOut">
              <button
                class="flex-1 py-2.5 bg-gray-400 text-white rounded-lg cursor-not-allowed font-medium flex items-center justify-center text-sm"
                disabled>
                <el-icon class="mr-1"><WarningFilled /></el-icon>
                产品已售罄
              </button>
              <!-- 关闭按钮 -->
              <button
                class="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center text-sm"
                @click="handleClose">
                <el-icon class="mr-1"><Close /></el-icon>关闭
              </button>
            </template>
            <!-- 正常状态 -->
            <template v-else>
              <!-- 立即购买/详情 -->
              <button
                class="flex-1 py-2.5 bg-danger text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center cursor-pointer text-sm"
                :disabled="loading && !buyUrl" @click="handleBuy">
                <el-icon v-if="loading" class="is-loading mr-1"><Loading /></el-icon>
                <el-icon v-else class="mr-1"><ShoppingCart /></el-icon>
                {{ loading ? "加载中" : buyUrl ? "购买" : "详情" }}
              </button>

              <!-- 二维码按钮 -->
              <button
                v-if="qrCodeUrl"
                class="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center cursor-pointer text-sm"
                @click="handleQrCodeClick">
                <el-icon class="mr-1"><Picture /></el-icon>二维码
              </button>

              <!-- 复制淘口令按钮（仅当有淘口令且hasTpwd不为false时显示） -->
              <button v-if="normalizedProduct?.longTpwd && buyUrl && hasTpwd !== false"
                class="flex-1 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center cursor-pointer text-sm"
                @click="handleCopyTpwd">
                <el-icon class="mr-1"><DocumentCopy /></el-icon>淘口令
              </button>

              <!-- 关闭按钮 -->
              <button
                class="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center text-sm"
                @click="handleClose">
                <el-icon class="mr-1"><Close /></el-icon>关闭
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 优惠券模态框 -->
    <ItemsCouponModal :visible="isCouponModalVisible" :coupon-link="currentCouponLink"
      :goods-id="normalizedProduct?.goodsId || ''" @close="handleCouponModalClose" />

    <!-- 复制成功提示 -->
    <div v-if="isCopySuccess"
      class="copy-success-toast fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div class="bg-black/80 text-white px-6 py-3 rounded-lg text-center font-medium shadow-lg animate-fade-in-out">
        淘口令已复制
      </div>
    </div>
    <!-- 二维码弹窗 -->
    <Teleport to="body">
      <div v-if="showQRCodeModal" class="fixed inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center" @click="showQRCodeModal = false">
        <div class="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" @click.stop>
          <h3 class="text-lg font-semibold text-center mb-1">扫码购买</h3>
          <p class="text-sm text-gray-500 text-center mb-4 line-clamp-1">{{ normalizedProduct?.dtitle || normalizedProduct?.title }}</p>
          <div class="flex justify-center mb-4">
            <img :src="qrCodeDataUrl" alt="二维码" class="w-[280px] h-[280px] border rounded-lg shadow-md" />
          </div>
          <p class="text-xs text-gray-400 text-center mb-4">使用淘宝App或支付宝扫码购买</p>
          <!-- 关闭按钮：显示复制状态或关闭 -->
          <button 
            class="w-full py-2.5 rounded-lg transition-colors font-medium flex items-center justify-center"
            :class="qrCopied ? 'bg-green-500 text-white' : 'border border-gray-300 hover:bg-gray-100'"
            @click="showQRCodeModal = false">
            <el-icon class="mr-2" v-if="!qrCopied"><Close /></el-icon>
            {{ qrCopied ? '二维码已复制' : '关闭' }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ElIcon } from 'element-plus';
import 'element-plus/es/components/icon/style/css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ItemsCouponModal from "./ItemsCouponModal.vue";
import { generateQRCodeDataUrl, qrCodeGenerator } from '@/utils/qrcode';
import { resolveCouponRemainCount } from '../../utils/dataoke/resolveCouponRemainCount';
import { ShoppingCart, Picture, DocumentCopy, Close, Loading, WarningFilled } from '@element-plus/icons-vue';

// 商品数据接口
interface DataokeProduct {
  id: string;
  goodsId: string;
  title: string;
  dtitle: string;
  originalPrice: number;
  actualPrice: number;
  shopType: number;
  monthSales: number;
  dailySales: number;
  twoHoursSales: number;
  desc: string;
  shopName: string;
  shopLevel: number;
  descScore: number;
  dsrScore: number;
  shipScore: number;
  serviceScore: number;
  mainPic: string;
  discounts: number;
  // 优惠券信息
  couponPrice?: number;
  couponConditions?: string;
  couponRemainCount?: number;
  couponLink?: string;
  // 品牌信息
  brandName?: string;
  // 活动信息
  activityInfo?: Array<{
    activityId: number;
    activityName: string;
  }>;
  // 特殊标签
  specialText?: string[];
  // 淘口令信息
  longTpwd?: string;
  // 其他字段...
}

// Props
const props = defineProps<{
  visible: boolean;
  product: DataokeProduct | null;
  loading: boolean;
  buyUrl?: string;
  hasTpwd?: boolean; // 是否有淘口令（备用API没有淘口令）
  shortUrl?: string; // 大淘客短链接
  itemUrl?: string;  // 好单库 itemUrl
  soldOut?: boolean; // 售罄状态
}>();

// Emits
const emit = defineEmits<{
  (e: "close"): void;
  (e: "buy", goodsId: string): void;
}>();

// 生成二维码的 URL（优先 shortUrl，否则使用 itemUrl）
const qrCodeUrl = computed(() => props.shortUrl || props.itemUrl || '');

// 统一数据格式的计算属性 - 同时支持大淘客和好单库字段
// 大淘客字段: goodsId, title/dtitle, mainPic, actualPrice, originalPrice, monthSales, couponPrice, couponLink, shopName, desc
// 好单库字段: itemid, itemtitle/itemshorttitle, itempic, itemendprice, itemprice, itemsale, couponmoney, couponurl, shopname, itemdesc
const normalizedProduct = computed(() => {
  if (!props.product) return null;
  
  const p = props.product as any;
  return {
    // 商品ID
    goodsId: p.goodsId || p.itemid || p.id,
    // 标题
    dtitle: p.dtitle || p.itemshorttitle || p.title || p.itemtitle || "未知商品",
    title: p.title || p.itemtitle || p.dtitle || p.itemshorttitle || "",
    // 图片
    mainPic: p.mainPic || p.itempic || "",
    // 价格
    actualPrice: parseFloat(p.actualPrice || p.itemendprice || 0),
    originalPrice: parseFloat(p.originalPrice || p.itemprice || 0),
    // 销量
    monthSales: parseInt(p.monthSales || p.itemsale || 0),
    dailySales: parseInt(p.dailySales || p.todaysale || 0),
    twoHoursSales: parseInt(p.twoHoursSales || 0),
    // 店铺信息
    shopName: p.shopName || p.shopname || "",
    shopType: p.shopType || p.shoptype || "",
    // 优惠券信息
    couponPrice: parseFloat(p.couponPrice || p.couponmoney || 0),
    couponConditions: p.couponConditions || p.coupon_condition || "",
    couponRemainCount: resolveCouponRemainCount(p),
    couponLink: p.couponLink || p.couponurl || "",
    couponInfo: p.couponinfo || "",
    // 描述
    desc: p.desc || p.itemdesc || p.guide_article || "",
    // 评分信息 (好单库可能没有这些字段)
    dsrScore: p.dsrScore || p.general_index || "-",
    descScore: p.descScore || "-",
    shipScore: p.shipScore || "-",
    serviceScore: p.serviceScore || "-",
    // 品牌和标签
    brandName: p.brandName || "",
    specialText: p.specialText || [],
    activityInfo: p.activityInfo || [],
    // 淘口令
    longTpwd: p.longTpwd || "",
    // 原始数据
    _raw: p
  };
});

// 格式化销量
const formatSales = (sales: number): string => {
  if (sales >= 10000) {
    return `${(sales / 10000).toFixed(1)}万`;
  }
  return sales.toString();
};

// 优惠券模态框状态
const isCouponModalVisible = ref(false);
const currentCouponLink = ref("");

// 复制淘口令状态
const isCopySuccess = ref(false);
const copySuccessTimer = ref<number | null>(null);

// 二维码弹窗状态
const showQRCodeModal = ref(false);
const qrCodeDataUrl = ref('');
const qrCopied = ref(false);

// 模态框图片重试逻辑
const modalImageSrc = ref("");
const modalImageRetryCount = ref(0);
const isModalImageError = ref(false);
const isModalImageRetrying = ref(false);
const MAX_MODAL_RETRY = 3;

// 初始化图片地址
watch(() => normalizedProduct.value?.mainPic, (newPic: string | null | undefined) => {
  if (newPic) {
    modalImageSrc.value = newPic;
    modalImageRetryCount.value = 0;
    isModalImageError.value = false;
    isModalImageRetrying.value = false;
  }
}, { immediate: true });

const handleModalImageError = () => {
  if (modalImageRetryCount.value < MAX_MODAL_RETRY) {
    modalImageRetryCount.value++;
    isModalImageRetrying.value = true;
    isModalImageError.value = false;
    
    console.debug(`[ProductModal] 主图加载失败，正在重试 (${modalImageRetryCount.value}/${MAX_MODAL_RETRY}):`, normalizedProduct.value?.mainPic);
    
    const delay = Math.min(1000 * Math.pow(2, modalImageRetryCount.value - 1), 5000);
    setTimeout(() => {
      if (!props.visible) return;
      const originalPic = normalizedProduct.value?.mainPic;
      if (!originalPic) return;
      // 先清空再重新赋值，强制触发图片重新加载
      modalImageSrc.value = '';
      setTimeout(() => {
        modalImageSrc.value = originalPic;
      }, 50);
    }, delay);
  } else {
    isModalImageError.value = true;
    isModalImageRetrying.value = false;
  }
};

const handleModalImageLoad = () => {
  isModalImageError.value = false;
  isModalImageRetrying.value = false;
  modalImageRetryCount.value = 0;
};

const manualRetryModalImage = () => {
  modalImageRetryCount.value = 0;
  isModalImageError.value = false;
  isModalImageRetrying.value = true;
  const originalPic = normalizedProduct.value?.mainPic;
  if (!originalPic) return;
  // 先清空再重新赋值，强制触发图片重新加载
  modalImageSrc.value = '';
  setTimeout(() => {
    modalImageSrc.value = originalPic;
  }, 50);
};

// 处理二维码点击
const handleQrCodeClick = async () => {
  if (!qrCodeUrl.value) return;
  
  try {
    // 重置状态
    qrCopied.value = false;
    qrCodeDataUrl.value = await generateQRCodeDataUrl(qrCodeUrl.value, 800);
    showQRCodeModal.value = true;
    
    // 尝试复制图片到剪贴板
    try {
      const canvas = await qrCodeGenerator.generateQRCode(qrCodeUrl.value, 800);
      await qrCodeGenerator.copyToClipboard(canvas);
      // 显示复制成功状态，2秒后恢复
      qrCopied.value = true;
      setTimeout(() => {
        qrCopied.value = false;
      }, 2000);
    } catch (copyErr) {
      console.error('复制二维码失败:', copyErr);
    }
  } catch (err) {
    console.error('二维码生成失败:', err);
  }
};

// 处理关闭模态框
const handleClose = () => {
  emit("close");
};

// 处理立即购买
const handleBuy = () => {
  if (normalizedProduct.value?.goodsId) {
    emit("buy", normalizedProduct.value.goodsId);
  }
};

// 处理优惠券点击事件
const handleCouponClick = () => {
  if (normalizedProduct.value && normalizedProduct.value.couponLink) {
    // 先设置couponLink，再显示模态框
    currentCouponLink.value = normalizedProduct.value.couponLink;
    isCouponModalVisible.value = true;
  }
};

// 处理优惠券模态框关闭
const handleCouponModalClose = () => {
  isCouponModalVisible.value = false;
  currentCouponLink.value = "";
};

// 处理复制淘口令
const handleCopyTpwd = () => {
  if (!normalizedProduct.value?.longTpwd) return;

  // 复制淘口令到剪贴板
  navigator.clipboard
    .writeText(normalizedProduct.value.longTpwd)
    .then(() => {
      // 清除之前的定时器
      if (copySuccessTimer.value) {
        clearTimeout(copySuccessTimer.value);
      }

      // 显示复制成功提示
      isCopySuccess.value = true;

      // 设置1秒后自动隐藏提示
      copySuccessTimer.value = window.setTimeout(() => {
        isCopySuccess.value = false;
        copySuccessTimer.value = null;
      }, 1000);
    })
    .catch((err) => {
      console.error("复制淘口令失败:", err);
    });
};
</script>

<style scoped>
/* 重置产品链接的默认样式 - 提高特异性 */
:deep(.product-link) {
  text-decoration: none !important;
  color: inherit !important;
  padding: 0 !important;
  background-color: transparent !important;
  transition: all 0.3s ease !important;
}

/* 产品链接悬停效果 - 提高特异性 */
:deep(.product-link:hover) {
  background-color: transparent !important;
  color: inherit !important;
  padding: 0 !important;
}

/* 确保媒体查询下的悬停效果也被覆盖 */
@media (hover: hover) {
  :deep(.product-link:hover) {
    background-color: transparent !important;
    color: inherit !important;
  }
}

/* 优化图片显示 */
.rounded-xl img {
  display: block;
  max-width: 100%;
  height: auto;
  object-fit: cover;
}

/* 调整内容间距 */
.space-y-4>*+* {
  margin-top: 1rem;
}

/* 优化按钮样式 */
.mt-6 {
  margin-top: 1.5rem;
}

/* 电脑端专用样式 */
@media (min-width: 1024px) {
  /* 可以添加电脑端专用样式 */
}

/* 复制成功提示样式 */
.copy-success-toast {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 100;
}

/* 淡入淡出动画 */
@keyframes fade-in-out {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }

  20% {
    opacity: 1;
    transform: translateY(0);
  }

  80% {
    opacity: 1;
    transform: translateY(0);
  }

  100% {
    opacity: 0;
    transform: translateY(10px);
  }
}

.animate-fade-in-out {
  animation: fade-in-out 1s ease-in-out forwards;
}

/* 模态框加载动画 */
.modal-loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: modal-spin 0.8s linear infinite;
}

@keyframes modal-spin {
  to { transform: rotate(360deg); }
}
</style>
