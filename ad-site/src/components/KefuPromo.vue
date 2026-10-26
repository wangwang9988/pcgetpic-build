<template>
  <div class="kefu-widget" @click="handleCardClick">
    <div class="widget-inner">
      <!-- 顶部：精简双排 14 个核心平台真实 SVG 图标 (2行 × 7列) -->
      <div class="platform-strip" aria-label="支持主流电商平台">
        <img
          v-for="item in platformIcons"
          :key="item.name"
          :src="item.icon"
          :alt="item.name"
          :title="item.name"
          class="platform-svg"
        />
      </div>

      <!-- 标题区：直击店主“招人难、盯店累”痛点 -->
      <div class="hero-copy">
        <div class="hero-eyebrow">10年专席直营 · 随用随配</div>
        <h1 class="hero-title">电商专席客服外包</h1>
        <p class="hero-desc">白晚班 · 包月 · 大促临时，不用自己招人</p>
      </div>

      <!-- 中部：Apple 浅色悬浮白卡（算账对比 + 核心保障合一，克制不杂乱） -->
      <div class="value-card">
        <div class="metrics-row">
          <div class="metric-col">
            <div class="metric-num metric-num--highlight">省50<small>%</small></div>
            <div class="metric-txt">比自聘省钱</div>
          </div>
          <div class="metric-divider" aria-hidden="true"></div>
          <div class="metric-col">
            <div class="metric-num">15<small>s</small></div>
            <div class="metric-txt">极速秒回</div>
          </div>
          <div class="metric-divider" aria-hidden="true"></div>
          <div class="metric-col">
            <div class="metric-num">+40<small>%</small></div>
            <div class="metric-txt">询单转化</div>
          </div>
        </div>
        <div class="card-foot">
          <span class="status-dot" aria-hidden="true"></span>
          <span>7×24h 全时段盯店 · 稳守 4.9+ 评分</span>
        </div>
      </div>

      <!-- 底部：激发点击欲的报价查询入口 -->
      <div class="action-bar">
        <span class="action-text">查看各平台包月报价单</span>
        <span class="action-arrow" aria-hidden="true">
          <svg viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import taobaoIcon from '@/assets/icons/taobao.svg?inline';
import tmallIcon from '@/assets/icons/tmall.svg?inline';
import jdIcon from '@/assets/icons/jd.svg?inline';
import pddIcon from '@/assets/icons/pdd.svg?inline';
import douyinIcon from '@/assets/icons/douyin.svg?inline';
import kuaishouIcon from '@/assets/icons/kuaishou.svg?inline';
import xiaohongshuIcon from '@/assets/icons/xiaohongshu.svg?inline';
import icon1688 from '@/assets/icons/1688.svg?inline';
import temuIcon from '@/assets/icons/temu.svg?inline';
import amazonIcon from '@/assets/icons/amazon.svg?inline';
import aliexpressIcon from '@/assets/icons/aliexpress.svg?inline';
import sheinIcon from '@/assets/icons/SHEIN.svg?inline';
import shopeeIcon from '@/assets/icons/shopee.svg?inline';
import tiktokIcon from '@/assets/icons/TIKTOK.svg?inline';

const props = withDefaults(defineProps<{
  standalone?: boolean;
  linkUrl?: string;
}>(), {
  standalone: false,
  linkUrl: 'https://www.yueding168.com/kf.html?utm_source=downpictures'
});

// 精选 14 个国内外最核心电商平台（2行 × 7列，适配小尺寸 iframe 空间）
const platformIcons = [
  { name: '淘宝', icon: taobaoIcon },
  { name: '天猫', icon: tmallIcon },
  { name: '京东', icon: jdIcon },
  { name: '拼多多', icon: pddIcon },
  { name: '抖音电商', icon: douyinIcon },
  { name: '快手电商', icon: kuaishouIcon },
  { name: '小红书', icon: xiaohongshuIcon },
  { name: '1688', icon: icon1688 },
  { name: 'Temu', icon: temuIcon },
  { name: '亚马逊', icon: amazonIcon },
  { name: '速卖通', icon: aliexpressIcon },
  { name: 'SHEIN', icon: sheinIcon },
  { name: 'Shopee', icon: shopeeIcon },
  { name: 'TikTok', icon: tiktokIcon },
];

const handleCardClick = () => {
  if (props.standalone && props.linkUrl) {
    window.open(props.linkUrl, '_blank', 'noopener,noreferrer');
  }
};
</script>

<style scoped>
/* Apple 浅色卡片容器：适配 pages.html 小尺寸网格 iframe */
.kefu-widget {
  width: 100%;
  height: 100%;
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 14px;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  background-color: #f5f5f7;
  color: #1d1d1f;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}

.widget-inner {
  width: 100%;
  max-width: 236px;
  height: 100%;
  max-height: 288px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
  box-sizing: border-box;
}

/* 顶部 2×7 真实平台 SVG 矩阵 */
.platform-strip {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  justify-items: center;
  align-items: center;
}

.platform-svg {
  width: 20px;
  height: 20px;
  border-radius: 4.5px;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.04));
}

/* 标题与痛点文案 */
.hero-copy {
  text-align: left;
}

.hero-eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  color: #0066cc;
  letter-spacing: 0.01em;
  line-height: 1.2;
}

.hero-title {
  margin: 3px 0 0;
  font-size: 21px;
  font-weight: 800;
  color: #1d1d1f;
  letter-spacing: -0.02em;
  line-height: 1.18;
}

.hero-desc {
  margin: 3px 0 0;
  font-size: 11px;
  font-weight: 500;
  color: #6e6e73;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 中部单一纯白悬浮卡（Apple Bento 风格） */
.value-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 9px 8px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03), 0 0 1px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
}

.metrics-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric-col {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.metric-divider {
  width: 1px;
  height: 24px;
  background-color: #f0f0f3;
  flex-shrink: 0;
}

.metric-num {
  font-size: 16px;
  font-weight: 800;
  color: #1d1d1f;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.metric-num--highlight {
  color: #0066cc;
}

.metric-num small {
  font-size: 10px;
  font-weight: 700;
  margin-left: 1px;
}

.metric-txt {
  margin-top: 2px;
  font-size: 10px;
  font-weight: 500;
  color: #86868b;
}

.card-foot {
  margin-top: 7px;
  padding-top: 6px;
  border-top: 1px solid #f2f2f7;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 500;
  color: #3a3a3c;
  white-space: nowrap;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #34c759;
  flex-shrink: 0;
}

/* 底部行动触发栏：明确传达可点击与价格好奇心 */
.action-bar {
  height: 34px;
  padding: 0 6px 0 13px;
  border-radius: 999px;
  background-color: #1d1d1f;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.kefu-widget:hover .action-bar {
  background-color: #2c2c2e;
  transform: translateY(-1px);
}

.action-text {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.action-arrow {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #0071e3;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.action-arrow svg {
  width: 12px;
  height: 12px;
}

.kefu-widget:hover .action-arrow {
  background-color: #0077ed;
  transform: translateX(1.5px);
}

/* 矮视口自适应 */
@media (max-height: 255px) {
  .card-foot {
    display: none;
  }

  .kefu-widget {
    padding: 10px 12px;
  }
}
</style>
