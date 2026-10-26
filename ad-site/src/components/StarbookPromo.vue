<template>
  <main class="promo-page">
    <div class="promo-background" aria-hidden="true">
      <img src="https://img.alicdn.com/imgextra/i1/1916442654/O1CN019izTRU1VTaJUZ2SYX_!!1916442654.webp" alt="" />
    </div>

    <section class="promo-content" aria-labelledby="starbook-promo-title">
      <div class="promo-brand">
        <img src="https://img.alicdn.com/imgextra/i4/1916442654/O1CN01aaEKN21VTaJUQ8j2z_!!1916442654.png" alt="" />
        <span>StarBook</span>
      </div>

      <div class="promo-copy">
        <h1 id="starbook-promo-title" class="promo-title">
          你的命盘，
          <span>藏着什么答案？</span>
        </h1>
        <p class="promo-description">AI 解读性格、关系与流年趋势</p>
      </div>

      <div class="promo-action">免费查看我的命盘</div>
    </section>
  </main>
</template>

<style scoped>
.promo-page {
  position: relative;
  width: 100%;
  max-width: 600px;
  height: 100vh;
  height: min(100dvh, 600px);
  max-height: 600px;
  margin: 0 auto;
  overflow: hidden;
  isolation: isolate;
  color: #fff4d2;
  background: #050403;
}

.promo-background {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.promo-background img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.promo-content {
  position: relative;
  z-index: 1;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(20px, 5.5vh, 32px) clamp(22px, 7vw, 38px);
  text-align: center;
}

.promo-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 11px;
}

.promo-brand img {
  width: clamp(36px, 9vw, 48px);
  height: clamp(36px, 9vw, 48px);
  flex: 0 0 auto;
  border-radius: 11px;
  object-fit: contain;
  box-shadow: 0 8px 24px rgba(238, 169, 20, 0.26);
}

.promo-brand span {
  color: #fffdf8;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(25px, 6.8vw, 36px);
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1;
}

.promo-copy {
  width: 100%;
  margin-top: clamp(18px, 5.2vh, 28px);
}

.promo-title {
  margin: 0;
  color: #f4c763;
  font-family: Georgia, "Times New Roman", "Microsoft YaHei", serif;
  font-size: clamp(38px, 9.8vw, 56px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.045em;
  text-shadow:
    0 0 10px rgba(255, 190, 54, 0.45),
    0 3px 20px rgba(0, 0, 0, 0.9);
}

.promo-title span {
  display: block;
}

.promo-description {
  margin: clamp(10px, 2.8vh, 16px) 0 0;
  color: rgba(255, 242, 207, 0.9);
  font-size: clamp(15px, 3.6vw, 18px);
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.025em;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
}

.promo-action {
  display: flex;
  box-sizing: border-box;
  width: min(300px, 78%);
  min-height: clamp(48px, 12vh, 58px);
  align-items: center;
  justify-content: center;
  margin-top: clamp(17px, 4.8vh, 26px);
  padding: 0 20px;
  border: 1px solid #ffe49a;
  border-radius: 999px;
  color: #231504;
  background: #f6bd2f;
  box-shadow:
    0 0 0 3px rgba(246, 189, 47, 0.15),
    0 10px 30px rgba(213, 133, 12, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.68);
  font-size: clamp(16px, 4vw, 20px);
  font-weight: 800;
  letter-spacing: 0.035em;
}

@media (max-height: 390px) {
  .promo-copy {
    margin-top: 15px;
  }

  .promo-title {
    font-size: clamp(34px, 8.8vw, 44px);
  }

  .promo-description {
    margin-top: 8px;
    font-size: 14px;
  }

  .promo-action {
    min-height: 46px;
    margin-top: 14px;
  }
}

@media (max-height: 310px) {
  .promo-description {
    display: none;
  }

  .promo-brand img {
    width: 34px;
    height: 34px;
  }

  .promo-brand span {
    font-size: 25px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .promo-brand,
  .promo-copy,
  .promo-action {
    animation: promo-reveal 620ms ease-out both;
  }

  .promo-copy {
    animation-delay: 70ms;
  }

  .promo-action {
    animation-delay: 140ms;
  }
}

@keyframes promo-reveal {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
