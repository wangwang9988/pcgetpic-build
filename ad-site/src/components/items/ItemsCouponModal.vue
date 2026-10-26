<template>
  <!-- 使用 transition 组件包裹模态框，添加淡入淡出动画 -->
  <transition name="modal-fade">
    <div v-show="visible" class="modal-overlay" @click.stop="handleClose">
      <!-- 模态框内容 -->
      <div class="modal-content" @click.stop>
        <!-- 头部 - 隐藏 -->
        <div class="modal-header" style="display: none">
          <h3 class="modal-title">优惠券详情</h3>
          <button class="close-btn" @click="handleClose">×</button>
        </div>

        <!-- 内容区域 -->
        <div class="modal-body">
          <iframe ref="couponIframe" :src="couponLink" class="coupon-iframe" frameborder="0" scrolling="no"
            @load="handleIframeLoad" @error="handleIframeError"></iframe>

          <!-- 加载动画层 - 渐进式加载，1.5秒后可点击穿透 -->
          <div v-show="isLoading" class="loading-overlay" :class="{ 'click-through': isClickThrough }">
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <p class="loading-text">{{ isClickThrough ? '加载中，可点击操作...' : '优惠券加载中，请稍候...' }}</p>
            </div>
          </div>

          <!-- 超时错误提示 - 使用 v-show 替代 v-if -->
          <div v-show="isTimeout" class="error-overlay">
            <div class="error-content">
              <p class="error-text">加载超时，请重试</p>
              <button class="retry-btn" @click="handleRetry">重新加载</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";

// Props定义
const props = defineProps<{
  visible: boolean;
  couponLink: string;
  goodsId: string;
}>();

// Emits定义
const emit = defineEmits<{
  (e: "close"): void;
}>();

// 状态管理
const couponIframe = ref<HTMLIFrameElement | null>(null);
const isLoading = ref(true);
const isTimeout = ref(false);
const timeoutTimer = ref<number | null>(null);
const isClickThrough = ref(false); // 是否可点击穿透
const clickThroughTimer = ref<number | null>(null); // 点击穿透定时器

// 监听couponLink变化
watch(() => props.couponLink, (newLink, oldLink) => {
  // 当couponLink变化时，重置加载状态
  if (newLink && newLink !== oldLink) {
    // 重置状态
    isLoading.value = true;
    isTimeout.value = false;
    isClickThrough.value = false;

    // 清理旧定时器
    if (timeoutTimer.value) {
      clearTimeout(timeoutTimer.value);
    }
    if (clickThroughTimer.value) {
      clearTimeout(clickThroughTimer.value);
    }

    // 设置1.5秒后启用点击穿透
    clickThroughTimer.value = window.setTimeout(() => {
      if (isLoading.value) {
        isClickThrough.value = true;
      }
    }, 1500);

    // 设置新的超时定时器 (8秒，给更多时间加载)
    timeoutTimer.value = window.setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false;
        isTimeout.value = true;
      }
    }, 8000);
  }
});

// 组件挂载时设置定时器
onMounted(() => {
  // 1.5秒后启用点击穿透
  clickThroughTimer.value = window.setTimeout(() => {
    if (isLoading.value) {
      isClickThrough.value = true;
    }
  }, 1500);

  // 8秒超时设置（给淘宝页面更多加载时间）
  timeoutTimer.value = window.setTimeout(() => {
    if (isLoading.value) {
      isLoading.value = false;
      isTimeout.value = true;
    }
  }, 8000);
});

// 组件卸载时清理资源
onUnmounted(() => {
  // 清理定时器，防止内存泄漏
  if (timeoutTimer.value) {
    clearTimeout(timeoutTimer.value);
  }
  if (clickThroughTimer.value) {
    clearTimeout(clickThroughTimer.value);
  }
});

// 处理关闭模态框
const handleClose = () => {
  // 清理定时器
  if (timeoutTimer.value) {
    clearTimeout(timeoutTimer.value);
  }
  if (clickThroughTimer.value) {
    clearTimeout(clickThroughTimer.value);
  }
  emit("close");
};

// 处理iframe加载完成
const handleIframeLoad = () => {
  // 清理定时器
  if (timeoutTimer.value) {
    clearTimeout(timeoutTimer.value);
    timeoutTimer.value = null;
  }
  if (clickThroughTimer.value) {
    clearTimeout(clickThroughTimer.value);
    clickThroughTimer.value = null;
  }
  // 隐藏加载动画
  isLoading.value = false;
  isTimeout.value = false;
  isClickThrough.value = false;
  console.log("iframe加载完成");
};

// 处理iframe加载错误
const handleIframeError = () => {
  // 清理定时器
  if (timeoutTimer.value) {
    clearTimeout(timeoutTimer.value);
    timeoutTimer.value = null;
  }
  if (clickThroughTimer.value) {
    clearTimeout(clickThroughTimer.value);
    clickThroughTimer.value = null;
  }
  // 显示错误状态
  isLoading.value = false;
  isTimeout.value = true;
  isClickThrough.value = false;
  console.error("iframe加载错误");
};

// 处理重试加载
const handleRetry = () => {
  // 重置状态
  isLoading.value = true;
  isTimeout.value = false;
  isClickThrough.value = false;

  // 设置1.5秒后启用点击穿透
  clickThroughTimer.value = window.setTimeout(() => {
    if (isLoading.value) {
      isClickThrough.value = true;
    }
  }, 1500);

  // 设置8秒超时
  timeoutTimer.value = window.setTimeout(() => {
    if (isLoading.value) {
      isLoading.value = false;
      isTimeout.value = true;
    }
  }, 8000);

  // 重新加载iframe
  if (couponIframe.value) {
    // 重新赋值src触发加载
    const src = couponIframe.value.src;
    couponIframe.value.src = '';
    setTimeout(() => {
      couponIframe.value?.setAttribute('src', src);
    }, 100);
  }
};
</script>

<style scoped>
/* 简化样式，只保留必要的样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

/* 模态框过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.95);
}

.modal-content {
  /* 设置基准字体大小为 64px，使 em 单位基于此计算 */
  font-size: 64px;
  /* 使用 em 单位，基于当前元素的 font-size 计算 */
  /* 7.5em × 64px = 480px, 3em × 64px = 192px */
  width: 7.5em;
  max-width: 7.5em;
  height: 3em;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* 防止字体大小导致行高撑开容器 */
  line-height: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.close-btn {
  width: 30px;
  height: 30px;
  font-size: 1.5rem;
  color: #666;
  background-color: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  /* 确保不产生额外空间 */
  line-height: 0;
  font-size: 0;
}

.coupon-iframe {
  width: 100%;
  height: 100%;
  border: none;
  /* 重置字体大小为浏览器默认值，避免继承 modal-content 的 64px */
  font-size: 16px;
  /* 禁止 iframe 内部和外部出现滚动条 */
  overflow: hidden;
  /* 移除 iframe 默认边距 */
  display: block;
  margin: 0;
  padding: 0;
}

/* 加载动画覆盖层 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  /* 过渡效果 */
  opacity: 1;
  transition: all 300ms ease-in-out;
}

/* 点击穿透模式 - 半透明且允许点击下层内容 */
.loading-overlay.click-through {
  background-color: rgba(255, 255, 255, 0.3);
  pointer-events: none;
}

/* 错误提示覆盖层 */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  /* 过渡效果 */
  opacity: 1;
  transition: opacity 300ms ease-in-out;
}

/* 加载内容容器 */
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* 错误内容容器 */
.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* 旋转加载图标 */
.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 旋转动画 */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 加载文本 */
.loading-text {
  font-size: 14px;
  color: #666;
  margin: 0;
}

/* 错误文本 */
.error-text {
  font-size: 14px;
  color: #e74c3c;
  margin: 0;
}

/* 重试按钮 */
.retry-btn {
  padding: 8px 16px;
  font-size: 14px;
  color: #fff;
  background-color: #3498db;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 200ms ease;
}

.retry-btn:hover {
  background-color: #2980b9;
}

/* 确保modal-body是相对定位，使得加载层可以绝对定位 */
.modal-body {
  position: relative;
}
</style>