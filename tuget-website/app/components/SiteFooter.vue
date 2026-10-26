<template>
  <footer class="site-footer">
    <div class="container footer-top">
      <div class="footer-brand">
        <div class="footer-brand-header">
          <img src="/tuget-icon.svg" width="38" height="38" alt="TuGet Logo">
          <strong>{{ t('footer.brandName') }}</strong>
        </div>
        <p class="footer-desc">
          {{ t('footer.brandDesc') }}
        </p>
        <div class="footer-trust-tags">
          <span class="footer-trust-tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {{ t('footer.tagEnterprise') }}
          </span>
          <span class="footer-trust-tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {{ t('footer.tagAlipay') }}
          </span>
          <span class="footer-trust-tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {{ t('footer.tagInvoice') }}
          </span>
        </div>
      </div>

      <div class="footer-column">
        <h4>{{ t('footer.colClient') }}</h4>
        <ul class="footer-links">
          <li><NuxtLink :to="localePath('/')">{{ t('footer.home') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/client/')">{{ t('footer.client') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/download/')">{{ t('footer.download') }}</NuxtLink></li>
          <li><NuxtLink :to="getBuyUrl()">{{ t('footer.buy') }}</NuxtLink></li>
        </ul>
      </div>

      <div class="footer-column">
        <h4>{{ t('footer.colPlatforms') }}</h4>
        <ul class="footer-links">
          <li><NuxtLink :to="localePath('/platforms/1688/')">{{ t('footer.p1688') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/platforms/taobao/')">{{ t('footer.pTaobao') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/platforms/jd/')">{{ t('footer.pJd') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/platforms/vip/')">{{ t('footer.pVip') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/platforms/pdd/')">{{ t('footer.pPdd') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/scenarios/media-sniffer/')">{{ t('footer.pMedia') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/solutions/ecommerce-designer/')">{{ t('footer.pDesigner') }}</NuxtLink></li>
        </ul>
      </div>

      <div class="footer-column">
        <h4>{{ t('footer.colLegal') }}</h4>
        <ul class="footer-links">
          <li><NuxtLink :to="localePath('/terms/')">{{ t('footer.terms') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/privacy/')">{{ t('footer.privacy') }}</NuxtLink></li>
          <li><a :href="icpUrl" target="_blank" rel="noopener noreferrer">{{ t('footer.icpQuery') }}</a></li>
          <li><NuxtLink :to="getBuyUrl()">{{ t('footer.support') }}</NuxtLink></li>
        </ul>
      </div>

      <div class="footer-column">
        <h4>{{ t('footer.colSupport') }}</h4>
        <div class="footer-support-box">
          <strong>{{ t('footer.supportTitle') }}</strong>
          <a :href="`mailto:${supportEmail}`" style="color: #60a5fa; word-break: break-all;">{{ supportEmail }}</a>
          <span>{{ t('footer.supportHours') }}</span>
          <span>{{ t('footer.supportScope') }}</span>
        </div>
      </div>
    </div>

    <div class="container footer-bottom">
      <div>
        <span>© {{ currentYear }} {{ t('footer.copyrightPrefix') }}{{ operatorName }}</span>
      </div>
      <div class="footer-bottom-right">
        <a :href="icpUrl" target="_blank" rel="noopener noreferrer">{{ icpNumber }}</a>
        <LangSwitcher variant="dark" direction="up" />
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { getBuyUrl } = useSiteSeo()
const config = useRuntimeConfig().public
const supportEmail = config.supportEmail
const operatorName = config.operatorName
const icpNumber = config.icpNumber
const icpUrl = config.icpUrl
const currentYear = new Date().getFullYear()
</script>

<style scoped>
.site-footer {
  background-color: #0f172a;
  color: #94a3b8;
  border-top: 1px solid #1e293b;
  font-size: 0.9rem;
}

.footer-top {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr;
  gap: 48px;
  padding-block: 64px 48px;
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.footer-brand-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.footer-brand-header img {
  width: 38px;
  height: 38px;
  border-radius: 8px;
}

.footer-brand-header strong {
  font-size: 1.15rem;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.footer-desc {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: #94a3b8;
}

.footer-trust-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.footer-trust-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  font-size: 0.72rem;
  font-weight: 500;
}

.footer-column h4 {
  margin: 0 0 16px 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.footer-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.footer-links a {
  color: #94a3b8;
  font-size: 0.88rem;
  transition: color 0.15s ease;
}

.footer-links a:hover {
  color: #ffffff;
}

.footer-support-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: var(--radius-sm);
  background-color: #1e293b;
  border: 1px solid #334155;
}

.footer-support-box strong {
  color: #ffffff;
  font-size: 0.88rem;
}

.footer-support-box span {
  font-size: 0.78rem;
  color: #94a3b8;
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-block: 24px;
  border-top: 1px solid #1e293b;
  font-size: 0.8rem;
  color: #64748b;
}

.footer-bottom a {
  color: #64748b;
}

.footer-bottom a:hover {
  color: #94a3b8;
}

.footer-bottom-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

@media (max-width: 1024px) {
  .footer-top {
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }
}

@media (max-width: 768px) {
  .footer-top {
    grid-template-columns: 1fr;
  }

  .footer-bottom {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
