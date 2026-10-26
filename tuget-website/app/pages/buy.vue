<template>
  <div class="checkout-page">
    <PaymentCheckout />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'checkout',
})

const config = useRuntimeConfig()
const apiBase = String(config.public.apiBase).replace(/\/$/, '')
const packagesUrl = `${apiBase}/payment/packages?product=tuget`

const title = 'TuGet（图个吉利）客户端官方授权中心 - 激活码价格与正版购买'
const description = '在官方授权中心购买 TuGet（图个吉利）客户端（TuGet Desktop）正版授权。官方直连授权中心，支付宝收银台，付款后即时全自动派发 TGTU 专属激活码，支持设备并发与增值税发票。'
const keywords = 'TuGet购买, 图个吉利购买, 图个吉利客户端授权, TuGet Desktop激活码, 网页图片批量下载软件购买, 支付宝支付'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: `${config.public.siteUrl}/buy/`,
  ogImage: `${config.public.siteUrl}/og.png`,
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: `${config.public.siteUrl}/og.png`,
})

useHead({
  meta: [{ name: 'keywords', content: keywords }],
  link: [{ rel: 'canonical', href: `${config.public.siteUrl}/buy/` }],
  script: [
    {
      key: 'tuget-packages-bootstrap',
      // 静态购买页解析到 <head> 时就启动套餐请求，避免等 Nuxt hydration/onMounted。
      // Promise 只缓存本次页面加载（含 8s 超时兜底），真正下单时后端仍会按 package_id 重新校验价格。
      innerHTML: `(function(){try{var c=typeof AbortController!=='undefined'?new AbortController():null;var t=c?setTimeout(function(){c.abort()},8000):null;window.__TUGET_PACKAGES_PROMISE__=fetch(${JSON.stringify(packagesUrl)},{credentials:'same-origin',headers:{Accept:'application/json'},signal:c?c.signal:undefined}).then(function(response){if(!response.ok)return null;return response.json()}).then(function(payload){return payload&&payload.success&&Array.isArray(payload.data)?payload.data:null}).catch(function(){return null}).finally(function(){if(t)clearTimeout(t)})}catch(e){}})()`,
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'TuGet（图个吉利）客户端正式授权',
        description,
        brand: { '@type': 'Brand', name: 'TuGet（图个吉利）' },
        category: 'Windows Desktop Software Application',
        url: `${config.public.siteUrl}/buy/`,
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: '首页',
            item: `${config.public.siteUrl}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: '客户端授权购买',
            item: `${config.public.siteUrl}/buy/`,
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.checkout-page {
  width: 100%;
}
</style>
