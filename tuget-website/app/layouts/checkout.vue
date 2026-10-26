<template>
  <div class="checkout-layout">
    <!-- 主收银工作区 -->
    <main class="checkout-main">
      <slot />
    </main>

    <!-- 极简合规页脚 -->
    <footer class="checkout-footer">
      <div class="checkout-footer-inner">
        <div class="footer-info">
          <span>© {{ currentYear }} TuGet · {{ t('footerCopyright') }} {{ operatorName }}</span>
          <span class="footer-dot">·</span>
          <a :href="icpUrl" target="_blank" rel="noopener noreferrer">{{ icpNumber }}</a>
          <span class="footer-dot">·</span>
          <span>{{ t('footerSupport') }}<a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a></span>
        </div>
        <div class="footer-links">
          <NuxtLink to="/terms/" target="_blank">{{ t('footerTerms') }}</NuxtLink>
          <span class="footer-dot">·</span>
          <NuxtLink to="/privacy/" target="_blank">{{ t('footerPrivacy') }}</NuxtLink>
        </div>
      </div>
    </footer>

    <!-- 一体化微信客服悬浮舱 (Floating Customer Service Dock) -->
    <div class="floating-cs-dock">
      <button
        type="button"
        class="cs-dock-btn"
        :title="t('csDockTitle')"
        @click="showContactModal = true"
      >
        <div class="cs-icon-circle">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.294.295a.34.34 0 0 0 .166-.046l1.903-1.1c.15-.086.326-.118.497-.087.986.257 2.036.398 3.12.398.375 0 .744-.018 1.106-.053-.243-.655-.382-1.354-.382-2.083 0-3.642 3.407-6.595 7.61-6.595.347 0 .688.022 1.023.061-.837-3.528-4.708-6.029-9.405-6.029zm-2.48 4.218a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm5.138 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM15.61 8.97c-3.528 0-6.39 2.457-6.39 5.485 0 3.029 2.862 5.486 6.39 5.486.8 0 1.569-.126 2.285-.353.136-.044.283-.035.413.04l1.498.868a.263.263 0 0 0 .13.036c.13 0 .235-.105.235-.235 0-.057-.023-.114-.038-.17l-.307-1.164a.465.465 0 0 1 .168-.524c1.442-1.06 2.365-2.624 2.365-4.364 0-3.028-2.862-5.485-6.39-5.485zm-2.127 3.328a.98.98 0 1 1 0 1.96.98.98 0 0 1 0-1.96zm4.254 0a.98.98 0 1 1 0 1.96.98.98 0 0 1 0-1.96z"/>
          </svg>
        </div>
        <div class="cs-text-group">
          <span class="cs-label">{{ t('csLabel') }}</span>
          <span class="cs-sublabel">{{ t('csSub') }}</span>
        </div>
      </button>
    </div>

    <!-- 客服与发票咨询弹窗 -->
    <transition name="fade">
      <div v-if="showContactModal" class="contact-modal-backdrop" @click.self="showContactModal = false">
        <div class="contact-modal-card">
          <div class="modal-header">
            <h3>{{ t('csModalTitle') }}</h3>
            <button type="button" class="modal-close-btn" :aria-label="t('closeLabel')" @click="showContactModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="wechat-tag">{{ t('csScan') }}</div>
            <p class="modal-lead">{{ t('csLead') }}</p>
            <div class="wechat-qr-wrapper">
              <img src="/Wechat.png" :alt="t('csScan')" class="wechat-qr-img">
            </div>
            <p class="modal-subtext">{{ t('csQrHint') }}</p>
            <div class="contact-rows">
              <div class="contact-row">
                <span class="row-label">{{ t('csSupportEmail') }}</span>
                <a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a>
              </div>
              <div class="contact-row">
                <span class="row-label">{{ t('csInvoiceTitle') }}</span>
                <span>{{ t('csInvoiceBody') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { useCheckoutI18n } from '~/composables/useCheckoutI18n'

const { t } = useCheckoutI18n()
const config = useRuntimeConfig().public
const supportEmail = config.supportEmail
const operatorName = config.operatorName
const icpNumber = config.icpNumber
const icpUrl = config.icpUrl
const currentYear = new Date().getFullYear()

const showContactModal = ref(false)
</script>

<style scoped>
.checkout-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-page);
}

/* 主内容区 */
.checkout-main {
  flex: 1;
  max-width: 1240px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

/* 极简页脚 */
.checkout-footer {
  background-color: #ffffff;
  border-top: 1px solid var(--border-light);
  padding: 18px 24px;
}

.checkout-footer-inner {
  max-width: 1240px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.footer-info,
.footer-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.footer-dot {
  color: var(--border-medium);
}

.checkout-footer a {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.15s ease;
}

.checkout-footer a:hover {
  color: var(--brand-primary);
  text-decoration: underline;
}

/* 悬浮客服舱 */
.floating-cs-dock {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 100;
}

.cs-dock-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 16px 7px 8px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: var(--radius-full);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.cs-dock-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.14);
  background: #ffffff;
}

.cs-icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(7, 193, 96, 0.12);
  color: #07c160;
  transition: all 0.2s ease;
}

.cs-dock-btn:hover .cs-icon-circle {
  background: #07c160;
  color: #ffffff;
  transform: scale(1.06);
}

.cs-text-group {
  display: flex;
  flex-direction: column;
  text-align: left;
  line-height: 1.2;
}

.cs-label {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-primary);
}

.cs-sublabel {
  font-size: 0.68rem;
  color: var(--text-muted);
}

/* 客服弹窗 */
.contact-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background-color: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.contact-modal-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-window);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
}

.modal-close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 24px 20px;
  text-align: center;
}

.wechat-tag {
  display: inline-block;
  padding: 3px 10px;
  background-color: rgba(7, 193, 96, 0.1);
  color: #07a854;
  font-size: 0.76rem;
  font-weight: 700;
  border-radius: var(--radius-full);
  margin-bottom: 10px;
}

.modal-lead {
  margin: 0 0 14px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.wechat-qr-wrapper {
  width: 200px;
  height: 200px;
  margin: 0 auto 12px;
  padding: 8px;
  background: #ffffff;
  border: 1px solid rgba(7, 193, 96, 0.2);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.wechat-qr-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 6px;
}

.modal-subtext {
  margin: 0 0 16px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.contact-rows {
  border-top: 1px dashed var(--border-light);
  padding-top: 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.82rem;
}

.contact-row {
  display: flex;
  gap: 6px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.row-label {
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.contact-row a {
  color: var(--brand-primary);
  text-decoration: none;
}

.contact-row a:hover {
  text-decoration: underline;
}

/* 动效 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .checkout-header-security {
    display: none;
  }

  .checkout-footer-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .floating-cs-dock {
    right: 16px;
    bottom: 20px;
  }
}
</style>
