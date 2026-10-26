<template>
  <div class="state-payment animate-fade-in-up">
    <section
      class="payment-container"
      :class="{ 'payment-container--dual': dualColumn }"
      :aria-label="headerTitle"
    >
      <!-- 顶部 Header：单栏为支付宝官方品牌栏；双栏为中性说明栏 -->
      <header v-if="!dualColumn" class="payment-header" :class="{ 'payment-header--stripe': payMode === 'stripe' }">
        <div class="brand-block">
          <div class="alipay-mark" :class="{ 'alipay-mark--stripe': payMode === 'stripe' }" aria-hidden="true">
            <svg
              v-if="payMode === 'stripe'"
              class="brand-mark-svg brand-mark-svg--stripe"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"
              />
            </svg>
            <svg
              v-else
              class="brand-mark-svg"
              viewBox="0.1 0 23.8 24"
            >
              <path
                fill="currentColor"
                d="M19.695 15.07c3.426 1.158 4.203 1.22 4.203 1.22V3.846c0-2.124-1.705-3.845-3.81-3.845H3.914C1.808.001.102 1.722.102 3.846v16.31c0 2.123 1.706 3.845 3.813 3.845h16.173c2.105 0 3.81-1.722 3.81-3.845v-.157s-6.19-2.602-9.315-4.119c-2.096 2.602-4.8 4.181-7.607 4.181-4.75 0-6.361-4.19-4.112-6.949.49-.602 1.324-1.175 2.617-1.497 2.025-.502 5.247.313 8.266 1.317a16.796 16.796 0 0 0 1.341-3.302H5.781v-.952h4.799V6.975H4.77v-.953h5.81V3.591s0-.409.411-.409h2.347v2.84h5.744v.951h-5.744v1.704h4.69a19.453 19.453 0 0 1-1.986 5.06c1.424.52 2.702 1.011 3.654 1.333m-13.81-2.032c-.596.06-1.71.325-2.321.869-1.83 1.608-.735 4.55 2.968 4.55 2.151 0 4.301-1.388 5.99-3.61-2.403-1.182-4.438-2.028-6.637-1.809"
              />
            </svg>
          </div>
          <div>
            <p class="brand-name">{{ payMode === 'stripe' ? 'Stripe' : t('alipayOfficial') }}</p>
            <h2 class="payment-title">{{ headerTitle }}</h2>
          </div>
        </div>

        <div class="security-badge">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.4 19 6v5.1c0 4.4-2.8 8.4-7 9.8-4.2-1.4-7-5.4-7-9.8V6l7-2.6Z" />
            <path d="m9.2 12.1 1.9 1.9 3.9-4" />
          </svg>
          <span>{{ t('rsa2Security') }}</span>
        </div>
      </header>

      <header v-else class="payment-header payment-header--dual">
        <div class="brand-block">
          <div class="brand-block-text">
            <p class="brand-name">{{ t('dualHeaderEyebrow') }}</p>
            <h2 class="payment-title">{{ headerTitle }}</h2>
          </div>
        </div>
        <div class="security-badge">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.4 19 6v5.1c0 4.4-2.8 8.4-7 9.8-4.2-1.4-7-5.4-7-9.8V6l7-2.6Z" />
            <path d="m9.2 12.1 1.9 1.9 3.9-4" />
          </svg>
          <span>{{ t('rsa2Security') }}</span>
        </div>
      </header>

      <div class="payment-body">
        <!--
          英文界面默认左右双栏：左栏 Stripe 港币（主推），右栏支付宝人民币（备选）。
          海外用户不必先看到 ¥ 和二维码再去找「切换」入口，两条通道一眼可比。
        -->
        <div v-if="dualColumn" class="dual-columns">
          <!-- 左栏：Stripe 国际支付 -->
          <div class="dual-col dual-col--stripe">
            <div class="dual-col-head">
              <span class="stripe-badge" role="img" aria-label="Stripe">
                <svg class="stripe-wordmark-svg" viewBox="16 11 88 38" aria-hidden="true">
                  <path
                    fill="currentColor"
                    fill-rule="evenodd"
                    d="M101.547 30.94c0-5.885-2.85-10.53-8.3-10.53-5.47 0-8.782 4.644-8.782 10.483 0 6.92 3.908 10.414 9.517 10.414 2.736 0 4.805-.62 6.368-1.494v-4.598c-1.563.782-3.356 1.264-5.632 1.264-2.23 0-4.207-.782-4.46-3.494h11.24c0-.3.046-1.494.046-2.046zM90.2 28.757c0-2.598 1.586-3.678 3.035-3.678 1.402 0 2.897 1.08 2.897 3.678zm-14.597-8.345c-2.253 0-3.7 1.057-4.506 1.793l-.3-1.425H65.73v26.805l5.747-1.218.023-6.506c.828.598 2.046 1.448 4.07 1.448 4.115 0 7.862-3.3 7.862-10.598-.023-6.667-3.816-10.3-7.84-10.3zm-1.38 15.84c-1.356 0-2.16-.483-2.713-1.08l-.023-8.53c.598-.667 1.425-1.126 2.736-1.126 2.092 0 3.54 2.345 3.54 5.356 0 3.08-1.425 5.38-3.54 5.38zm-16.4-17.196l5.77-1.24V13.15l-5.77 1.218zm0 1.747h5.77v20.115h-5.77zm-6.185 1.7l-.368-1.7h-4.966V40.92h5.747V27.286c1.356-1.77 3.655-1.448 4.368-1.195v-5.287c-.736-.276-3.425-.782-4.782 1.7zm-11.494-6.7L34.535 17l-.023 18.414c0 3.402 2.552 5.908 5.954 5.908 1.885 0 3.264-.345 4.023-.76v-4.667c-.736.3-4.368 1.356-4.368-2.046V25.7h4.368v-4.897h-4.37zm-15.54 10.828c0-.897.736-1.24 1.954-1.24a12.85 12.85 0 0 1 5.7 1.47V21.47c-1.908-.76-3.793-1.057-5.7-1.057-4.667 0-7.77 2.437-7.77 6.506 0 6.345 8.736 5.333 8.736 8.07 0 1.057-.92 1.402-2.207 1.402-1.908 0-4.345-.782-6.276-1.84v5.47c2.138.92 4.3 1.3 6.276 1.3 4.782 0 8.07-2.368 8.07-6.483-.023-6.85-8.782-5.632-8.782-8.207z"
                  />
                </svg>
              </span>
              <div class="dual-col-head-text">
                <p class="dual-col-eyebrow">{{ t('stripeCardTitle') }}</p>
                <span class="dual-col-ssl">{{ t('stripeSslBadge') }}</span>
              </div>
            </div>

            <div class="dual-amount">
              <span class="dual-amount-label">{{ t('stripeAmountDue') }}</span>
              <strong class="dual-amount-value">HK$ {{ formatHkd(hkdAmount ?? 0) }}</strong>
              <span class="dual-amount-note">{{ t('stripeNote') }}</span>
            </div>

            <button
              type="button"
              class="stripe-primary-btn"
              :disabled="redirectingStripe"
              @click="emit('payStripe')"
            >
              <template v-if="redirectingStripe">{{ t('stripeRedirecting') }}</template>
              <template v-else>{{ t('stripePayCta') }} (HK$ {{ formatHkd(hkdAmount ?? 0) }}) →</template>
            </button>

            <div class="stripe-badges" role="list" aria-label="Supported payment methods">
              <!-- Visa -->
              <span class="stripe-badge-chip" role="listitem" title="Visa" aria-label="Visa">
                <svg class="stripe-method-svg" viewBox="12 18 96 44" aria-hidden="true">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M86.6666 44.9375L90.3239 35.0625L92.3809 44.9375H86.6666ZM100.952 52.8375L95.8086 27.1625H88.7383C86.3525 27.1625 85.7723 29.0759 85.7723 29.0759L76.1904 52.8375H82.8868L84.2269 49.0244H92.3947L93.1479 52.8375H100.952Z" fill="#1434CB" />
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M77.1866 33.5711L78.0952 28.244C78.0952 28.244 75.2896 27.1625 72.3648 27.1625C69.2031 27.1625 61.6955 28.5638 61.6955 35.3738C61.6955 41.7825 70.5071 41.8621 70.5071 45.2266C70.5071 48.5912 62.6034 47.9901 59.9955 45.8676L59.0476 51.4362C59.0476 51.4362 61.8919 52.8375 66.2397 52.8375C70.5869 52.8375 77.1467 50.5544 77.1467 44.3455C77.1467 37.8964 68.2552 37.296 68.2552 34.4921C68.2552 31.6882 74.4602 32.0484 77.1866 33.5711Z" fill="#1434CB" />
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M54.6517 52.8375H47.6191L52.0144 27.1625H59.0477L54.6517 52.8375Z" fill="#1434CB" />
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M42.3113 27.1625L35.9217 44.8213L35.1663 41.0185L35.167 41.0199L32.9114 29.4749C32.9114 29.4749 32.6394 27.1625 29.7324 27.1625H19.1709L19.0476 27.5966C19.0476 27.5966 22.2782 28.2669 26.057 30.5326L31.8793 52.8375H38.8617L49.5238 27.1625H42.3113Z" fill="#1434CB" />
                </svg>
              </span>

              <!-- Mastercard -->
              <span class="stripe-badge-chip" role="listitem" title="Mastercard" aria-label="Mastercard">
                <svg class="stripe-method-svg" viewBox="14 10 92 60" aria-hidden="true">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M97.5288 54.6562V53.7384H97.289L97.0137 54.3698L96.7378 53.7384H96.498V54.6562H96.6675V53.9637L96.9257 54.5609H97.1011L97.36 53.9624V54.6562H97.5288ZM96.0111 54.6562V53.8947H96.318V53.7397H95.5361V53.8947H95.843V54.6562H96.0111Z" fill="#F79E1B" />
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M49.6521 58.595H70.3479V21.4044H49.6521V58.595Z" fill="#FF5F00" />
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M98.2675 40.0003C98.2675 53.063 87.6791 63.652 74.6171 63.652C69.0996 63.652 64.0229 61.7624 60 58.5956C65.5011 54.2646 69.0339 47.5448 69.0339 40.0003C69.0339 32.4552 65.5011 25.7354 60 21.4044C64.0229 18.2376 69.0996 16.348 74.6171 16.348C87.6791 16.348 98.2675 26.937 98.2675 40.0003Z" fill="#F79E1B" />
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M50.966 40.0003C50.966 32.4552 54.4988 25.7354 59.9999 21.4044C55.977 18.2376 50.9003 16.348 45.3828 16.348C32.3208 16.348 21.7324 26.937 21.7324 40.0003C21.7324 53.063 32.3208 63.652 45.3828 63.652C50.9003 63.652 55.977 61.7624 59.9999 58.5956C54.4988 54.2646 50.966 47.5448 50.966 40.0003Z" fill="#EB001B" />
                </svg>
              </span>

              <!-- American Express -->
              <span class="stripe-badge-chip stripe-badge-chip--amex" role="listitem" title="American Express" aria-label="American Express">
                <svg class="stripe-method-svg" viewBox="0 0 120 80" aria-hidden="true">
                  <rect x="40" width="80" height="80" rx="4" fill="#ffffff" fill-rule="evenodd" />
                  <path d="m120 76v-8.6763h-9.651l-4.969-5.4944-4.994 5.4944h-31.822v-25.607h-10.27l12.74-28.831h12.286l4.3857 9.877v-9.877h15.208l2.64 7.4429 2.658-7.4429h11.789v-8.8854c0-2.2091-1.7909-4-4-4h-112c-2.2091 0-4 1.7909-4 4v72c0 2.2091 1.7909 4 4 4h112c2.2091 0 4-1.7909 4-4zm-8.026-11.882h8.026l-10.616-11.258 10.616-11.13h-7.898l-6.556 7.1645-6.4935-7.1645h-8.0275l10.554 11.194-10.554 11.194h7.8041l6.5889-7.2283 6.556 7.2283zm1.878-11.249 6.148 6.5406v-13.027l-6.148 6.4861zm-35.78 6.0675v-3.4864h12.633v-5.0534h-12.633v-3.4859h12.953l5e-4 -5.1815h-19.062v22.388h19.062l-5e-4 -5.1813h-12.953zm35.883-20.456h6.045v-22.388h-9.403l-5.022 13.944-4.989-13.944h-9.5631v22.388h6.0446v-15.672l5.7575 15.672h5.373l5.757-15.704v15.704zm-29.809 0h6.8765l-9.8824-22.388h-7.8682l-9.8833 22.388h6.7166l1.8554-4.4776h10.298l1.887 4.4776zm-3.9976-9.4992h-6.0773l3.0387-7.3242 3.0386 7.3242z" fill="#016FD0" />
                </svg>
              </span>

              <!-- Apple Pay -->
              <span class="stripe-badge-chip" role="listitem" title="Apple Pay" aria-label="Apple Pay">
                <svg class="stripe-method-svg" viewBox="8 14 104 52" aria-hidden="true">
                  <path d="M55.5533 22.9046C61.103 22.9046 64.9675 26.7301 64.9675 32.2997C64.9675 37.8892 61.0235 41.7345 55.4142 41.7345H49.2696V51.5062H44.8301V22.9046L55.5533 22.9046ZM49.2695 38.0081H54.3635C58.2288 38.0081 60.4286 35.9271 60.4286 32.3196C60.4286 28.7124 58.2288 26.6509 54.3834 26.6509H49.2695V38.0081Z" fill="#000000" />
                  <path d="M66.1274 45.5799C66.1274 41.9326 68.9222 39.6929 73.8778 39.4154L79.5858 39.0786V37.4732C79.5858 35.1541 78.0198 33.7666 75.404 33.7666C72.9258 33.7666 71.3797 34.9556 71.0035 36.8191H66.9601C67.1979 33.0528 70.4086 30.278 75.5623 30.278C80.6165 30.278 83.8471 32.9538 83.8471 37.136V51.5062H79.7441V48.0772H79.6454C78.4365 50.3963 75.8001 51.8629 73.065 51.8629C68.9818 51.8629 66.1274 49.3258 66.1274 45.5799ZM79.5858 43.697V42.0518L74.452 42.3688C71.8951 42.5473 70.4484 43.6771 70.4484 45.461C70.4484 47.2842 71.9547 48.4736 74.254 48.4736C77.2468 48.4736 79.5858 46.4122 79.5858 43.697Z" fill="#000000" />
                  <path d="M87.7206 59.177V55.7082C88.0372 55.7874 88.7506 55.7874 89.1077 55.7874C91.0896 55.7874 92.1601 54.9551 92.8139 52.8145C92.8139 52.7747 93.1908 51.5459 93.1908 51.5261L85.6592 30.6546H90.2967L95.5696 47.6214H95.6484L100.921 30.6546H105.44L97.6303 52.5962C95.8472 57.6508 93.7857 59.276 89.4648 59.276C89.1077 59.276 88.0372 59.2363 87.7206 59.177Z" fill="#000000" />
                  <path d="M31.7358 25.6955C32.8058 24.3572 33.5319 22.5603 33.3404 20.724C31.7741 20.8019 29.8627 21.7573 28.7562 23.0967C27.7626 24.2436 26.8832 26.1158 27.1124 27.8751C28.8707 28.0276 30.6273 26.9962 31.7358 25.6955Z" fill="#000000" />
                  <path d="M33.3204 28.2186C30.7671 28.0665 28.5961 29.6678 27.3767 29.6678C26.1567 29.6678 24.2894 28.2952 22.2698 28.3322C19.6412 28.3708 17.2022 29.8571 15.8682 32.2209C13.1246 36.9497 15.1442 43.9642 17.8122 47.8155C19.1079 49.7209 20.6694 51.8189 22.7269 51.7435C24.6709 51.6672 25.4328 50.4847 27.7958 50.4847C30.1571 50.4847 30.8435 51.7435 32.9013 51.7054C35.0353 51.6672 36.3695 49.799 37.6651 47.8918C39.1515 45.7198 39.7599 43.6225 39.7982 43.5073C39.7599 43.4692 35.6832 41.9053 35.6454 37.2158C35.6069 33.2892 38.8461 31.4215 38.9985 31.3057C37.1694 28.6003 34.3113 28.2952 33.3204 28.2186Z" fill="#000000" />
                </svg>
              </span>

              <!-- Google Pay -->
              <span class="stripe-badge-chip" role="listitem" title="Google Pay" aria-label="Google Pay">
                <svg class="stripe-method-svg" viewBox="8 14 104 52" aria-hidden="true">
                  <path d="M57.5437 26.997V35.9796H63.0833C64.4033 35.9796 65.4945 35.5352 66.3569 34.6486C67.2435 33.7642 67.6879 32.7082 67.6879 31.4872C67.6879 30.2904 67.2435 29.2476 66.3569 28.3588C65.4945 27.4502 64.4033 26.9948 63.0833 26.9948H57.5437V26.997ZM57.5437 39.141V49.5602H54.2349V23.8356H63.0129C65.2415 23.8356 67.1335 24.577 68.6933 26.062C70.2773 27.547 71.0693 29.3554 71.0693 31.4872C71.0693 33.6674 70.2773 35.489 68.6933 36.9476C67.1599 38.4106 65.2635 39.1388 63.0107 39.1388H57.5437V39.141ZM74.4133 44.1724C74.4133 45.0348 74.7785 45.752 75.5111 46.3284C76.2415 46.9004 77.0995 47.1886 78.0807 47.1886C79.4733 47.1886 80.7119 46.6738 81.8031 45.6464C82.8965 44.6146 83.4399 43.4046 83.4399 42.0164C82.4081 41.2024 80.9693 40.7954 79.1235 40.7954C77.7815 40.7954 76.6595 41.121 75.7619 41.7678C74.8621 42.4146 74.4133 43.2132 74.4133 44.1724ZM78.6945 31.3794C81.1409 31.3794 83.0703 32.0328 84.4871 33.3374C85.8995 34.6442 86.6079 36.435 86.6079 38.7098V49.5602H83.4421V47.1182H83.2991C81.9307 49.129 80.1091 50.1366 77.8299 50.1366C75.8895 50.1366 74.2637 49.5602 72.9569 48.4118C71.6501 47.2612 70.9967 45.8246 70.9967 44.0998C70.9967 42.2782 71.6853 40.8306 73.0647 39.7526C74.4441 38.6746 76.2833 38.1356 78.5867 38.1356C80.5491 38.1356 82.1705 38.4942 83.4399 39.2136V38.4568C83.4399 37.3084 82.9845 36.3316 82.0737 35.5308C81.1961 34.7411 80.0531 34.3114 78.8727 34.3274C77.0247 34.3274 75.5639 35.104 74.4837 36.6638L71.5709 34.829C73.1769 32.53 75.5529 31.3794 78.6945 31.3794ZM104.771 31.9558L93.7271 57.3218H90.3105L94.4113 48.447L87.1469 31.9558H90.7439L95.9953 44.6036H96.0657L101.174 31.9536L104.771 31.9558Z" fill="#3C4043" />
                  <path d="M44.1722 36.8948C44.1722 35.8542 44.0842 34.8488 43.917 33.8896H29.9602V39.5832H37.955C37.6239 41.4215 36.5557 43.0445 34.9982 44.0756V47.7716H39.77C42.564 45.1976 44.1722 41.3916 44.1722 36.8948Z" fill="#4285F4" />
                  <path d="M29.9603 51.34C33.9555 51.34 37.3171 50.031 39.7701 47.7738L34.9983 44.0756C33.6717 44.9688 31.9623 45.4902 29.9603 45.4902C26.1015 45.4902 22.8235 42.8898 21.6531 39.3874H16.7383V43.1956C19.2527 48.1909 24.3678 51.3425 29.9603 51.3422" fill="#34A853" />
                  <path d="M21.6529 39.3874C21.0355 37.5518 21.0355 35.5646 21.6529 33.729V29.9208H16.7381C15.6991 31.9782 15.1587 34.2512 15.1606 36.556C15.1606 38.943 15.7327 41.198 16.7381 43.1934L21.6529 39.3852V39.3874Z" fill="#FABB05" />
                  <path d="M29.96 27.6262C32.1424 27.6262 34.096 28.3742 35.636 29.8438V29.846L39.86 25.6264C37.2992 23.2416 33.9552 21.7764 29.9622 21.7764C24.3703 21.7757 19.2553 24.9264 16.7402 29.9208L21.655 33.729C22.8254 30.2266 26.1034 27.6262 29.9622 27.6262" fill="#E94235" />
                </svg>
              </span>

              <!-- Link by Stripe -->
              <span class="stripe-badge-chip" role="listitem" title="Link" aria-label="Link">
                <svg class="stripe-method-svg" viewBox="-6 -7 90 40" aria-hidden="true">
                  <path fill="#011E0F" d="M39.321 3.983c0-1.222 1.035-2.215 2.252-2.215 1.218 0 2.253.998 2.253 2.215a2.254 2.254 0 0 1-2.253 2.241 2.234 2.234 0 0 1-2.252-2.241M32.638 2.08h3.919v21.84h-3.92zM43.554 8.32h-3.95v15.6h3.95zM71.954 15.59c2.973-1.82 4.996-4.53 5.795-7.276H73.8c-1.03 2.621-3.392 4.592-5.989 5.43V2.073h-3.95v21.84h3.95V17.42c3.015.748 5.398 3.343 6.213 6.494H78c-.606-3.307-2.88-6.4-6.046-8.325M50.556 10.067c1.035-1.368 3.052-2.163 4.687-2.163 3.052 0 5.576 2.22 5.58 5.574v10.436h-3.95v-9.568c0-1.378-.616-2.969-2.617-2.969-2.352 0-3.705 2.075-3.705 4.503v8.045H46.6V8.33h3.955z" />
                  <circle cx="13" cy="13" r="13" fill="#00D66F" />
                  <path fill="#011E0F" d="M12.462 5.2H8.434c.783 3.26 3.072 6.048 5.936 7.8-2.87 1.753-5.153 4.54-5.936 7.8h4.028c.998-3.016 3.763-5.637 7.16-6.172v-3.26c-3.402-.531-6.167-3.152-7.16-6.168" />
                </svg>
              </span>
            </div>
          </div>

          <!-- 右栏：支付宝二维码 -->
          <div class="dual-col dual-col--alipay">
            <div class="dual-col-head">
              <div class="alipay-mark alipay-mark--sm" aria-hidden="true">
                <svg class="brand-mark-svg" viewBox="0.1 0 23.8 24">
                  <path
                    fill="currentColor"
                    d="M19.695 15.07c3.426 1.158 4.203 1.22 4.203 1.22V3.846c0-2.124-1.705-3.845-3.81-3.845H3.914C1.808.001.102 1.722.102 3.846v16.31c0 2.123 1.706 3.845 3.813 3.845h16.173c2.105 0 3.81-1.722 3.81-3.845v-.157s-6.19-2.602-9.315-4.119c-2.096 2.602-4.8 4.181-7.607 4.181-4.75 0-6.361-4.19-4.112-6.949.49-.602 1.324-1.175 2.617-1.497 2.025-.502 5.247.313 8.266 1.317a16.796 16.796 0 0 0 1.341-3.302H5.781v-.952h4.799V6.975H4.77v-.953h5.81V3.591s0-.409.411-.409h2.347v2.84h5.744v.951h-5.744v1.704h4.69a19.453 19.453 0 0 1-1.986 5.06c1.424.52 2.702 1.011 3.654 1.333m-13.81-2.032c-.596.06-1.71.325-2.321.869-1.83 1.608-.735 4.55 2.968 4.55 2.151 0 4.301-1.388 5.99-3.61-2.403-1.182-4.438-2.028-6.637-1.809"
                  />
                </svg>
              </div>
              <div class="dual-col-head-text">
                <p class="dual-col-eyebrow">{{ t('alipayCardTitle') }}</p>
                <span class="dual-col-ssl">{{ t('rsa2Security') }}</span>
              </div>
            </div>

            <div class="dual-amount">
              <span class="dual-amount-label">{{ t('amountDue') }}</span>
              <strong class="dual-amount-value">¥{{ formatPrice(finalPrice) }}</strong>
              <span class="dual-amount-note">{{ t('alipayCnyNote') }}</span>
            </div>

            <div class="qrcode-area qrcode-area--dual">
              <div class="qrcode-wrapper">
                <img
                  v-if="qrDataUrl"
                  :src="qrDataUrl"
                  :alt="t('alipayBrand')"
                  class="qrcode-img"
                  width="210"
                  height="210"
                >
                <!-- 通道降级：没有 qr_code 时给明确说明，不能无限转圈 -->
                <div v-else-if="qrUnavailable" class="qrcode-placeholder qrcode-placeholder--notice">
                  <span>{{ t('qrUnavailable') }}</span>
                </div>
                <div v-else class="qrcode-placeholder">
                  <span class="spinner-dot" />
                  <span>{{ t('scanTip') }}</span>
                </div>
              </div>
              <div v-if="!qrUnavailable" class="payment-tip">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
                </svg>
                <span>{{ t('scanTip') }}</span>
              </div>
            </div>

            <a
              v-if="orderData?.pay_url"
              :href="orderData.pay_url"
              target="_blank"
              rel="noopener noreferrer"
              class="account-pay-link"
            >
              <span>{{ t('cannotScan') }}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5h11v11" />
                <path d="m19 5-13 13" />
              </svg>
            </a>
          </div>
        </div>

        <p v-if="dualColumn" class="dual-hint">{{ t('dualHintNote') }}</p>

        <!-- 单栏模式：核对金额面板（支付宝显示人民币，切到 Stripe 后显示港币） -->
        <div v-else class="amount-panel" :class="{ 'amount-panel--stripe': payMode === 'stripe' }">
          <span class="payment-amount-label">
            {{ payMode === 'stripe' ? t('stripeAmountDue') : t('amountDue') }}
          </span>
          <strong v-if="payMode === 'stripe' && hkdAmount" class="payment-amount-value">
            HK$ {{ formatHkd(hkdAmount) }}
          </strong>
          <strong v-else class="payment-amount-value">¥{{ formatPrice(finalPrice) }}</strong>
          <span class="amount-note">
            {{ payMode === 'stripe' ? t('stripeNote') : t('amountNote') }}
          </span>
        </div>

        <!-- 单栏模式：支付宝二维码展示区（带科技感扫描定位角标） -->
        <div v-if="!dualColumn && payMode === 'alipay'" class="qrcode-area">
          <div class="qrcode-wrapper">
            <img
              v-if="qrDataUrl"
              :src="qrDataUrl"
              :alt="t('alipayBrand')"
              class="qrcode-img"
              width="210"
              height="210"
            >
            <!-- 通道降级：没有 qr_code 时给明确说明，不能无限转圈 -->
            <div v-else-if="qrUnavailable" class="qrcode-placeholder qrcode-placeholder--notice">
              <span>{{ t('qrUnavailable') }}</span>
            </div>
            <div v-else class="qrcode-placeholder">
              <span class="spinner-dot" />
              <span>{{ t('scanTip') }}</span>
            </div>
          </div>
          <div v-if="!qrUnavailable" class="payment-tip">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
            </svg>
            <span>{{ t('scanTip') }}</span>
          </div>

          <!-- 低调的港币切换入口：默认人民币，仅在此处提供出口 -->
          <button
            v-if="canUseStripe"
            type="button"
            class="stripe-switch-entry"
            @click="switchToStripe"
          >
            {{ t('switchToStripe') }}
          </button>
        </div>

        <!-- 单栏模式：Stripe 港币结算视图 -->
        <div v-else-if="!dualColumn" class="stripe-panel">
          <div class="stripe-brand-row">
            <span class="stripe-badge" role="img" aria-label="Stripe">
              <svg class="stripe-wordmark-svg" viewBox="16 11 88 38" aria-hidden="true">
                <path
                  fill="currentColor"
                  fill-rule="evenodd"
                  d="M101.547 30.94c0-5.885-2.85-10.53-8.3-10.53-5.47 0-8.782 4.644-8.782 10.483 0 6.92 3.908 10.414 9.517 10.414 2.736 0 4.805-.62 6.368-1.494v-4.598c-1.563.782-3.356 1.264-5.632 1.264-2.23 0-4.207-.782-4.46-3.494h11.24c0-.3.046-1.494.046-2.046zM90.2 28.757c0-2.598 1.586-3.678 3.035-3.678 1.402 0 2.897 1.08 2.897 3.678zm-14.597-8.345c-2.253 0-3.7 1.057-4.506 1.793l-.3-1.425H65.73v26.805l5.747-1.218.023-6.506c.828.598 2.046 1.448 4.07 1.448 4.115 0 7.862-3.3 7.862-10.598-.023-6.667-3.816-10.3-7.84-10.3zm-1.38 15.84c-1.356 0-2.16-.483-2.713-1.08l-.023-8.53c.598-.667 1.425-1.126 2.736-1.126 2.092 0 3.54 2.345 3.54 5.356 0 3.08-1.425 5.38-3.54 5.38zm-16.4-17.196l5.77-1.24V13.15l-5.77 1.218zm0 1.747h5.77v20.115h-5.77zm-6.185 1.7l-.368-1.7h-4.966V40.92h5.747V27.286c1.356-1.77 3.655-1.448 4.368-1.195v-5.287c-.736-.276-3.425-.782-4.782 1.7zm-11.494-6.7L34.535 17l-.023 18.414c0 3.402 2.552 5.908 5.954 5.908 1.885 0 3.264-.345 4.023-.76v-4.667c-.736.3-4.368 1.356-4.368-2.046V25.7h4.368v-4.897h-4.37zm-15.54 10.828c0-.897.736-1.24 1.954-1.24a12.85 12.85 0 0 1 5.7 1.47V21.47c-1.908-.76-3.793-1.057-5.7-1.057-4.667 0-7.77 2.437-7.77 6.506 0 6.345 8.736 5.333 8.736 8.07 0 1.057-.92 1.402-2.207 1.402-1.908 0-4.345-.782-6.276-1.84v5.47c2.138.92 4.3 1.3 6.276 1.3 4.782 0 8.07-2.368 8.07-6.483-.023-6.85-8.782-5.632-8.782-8.207z"
                />
              </svg>
            </span>
            <span class="stripe-methods">{{ t('stripeMethods') }}</span>
          </div>
          <button
            type="button"
            class="stripe-primary-btn"
            :disabled="redirectingStripe"
            @click="emit('payStripe')"
          >
            {{ redirectingStripe ? t('stripeRedirecting') : t('goStripe') }}<template
              v-if="hkdAmount && !redirectingStripe"
            > HK$ {{ formatHkd(hkdAmount) }}</template>
          </button>
          <button type="button" class="stripe-back-btn" @click="switchBackToAlipay">
            {{ t('backToAlipay') }}（¥{{ formatPrice(finalPrice) }}）
          </button>
        </div>

        <!-- 实时订单有效倒计时 -->
        <div class="countdown-panel" :class="{ 'countdown-panel-expired': countdownSeconds <= 0 }">
          <div class="countdown-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4l2.6 1.6" />
            </svg>
          </div>
          <div class="countdown-content">
            <template v-if="countdownSeconds > 0">
              <span class="countdown-label">{{ t('qrValidity') }}</span>
              <span class="countdown-time" :class="{ 'countdown-urgent': countdownSeconds < 60 }">
                {{ formatCountdown(countdownSeconds) }}
              </span>
              <span class="countdown-hint">{{ t('countdownHint') }}</span>
            </template>
            <template v-else>
              <span class="countdown-expired">{{ t('countdownExpired') }}</span>
            </template>
          </div>
        </div>

        <!-- 双重官方信任背书 -->
        <div class="trust-strip">
          <div class="trust-item">
            <span class="trust-dot" aria-hidden="true" />
            <span>{{ t('trustDirect') }}</span>
          </div>
          <div class="trust-item">
            <span class="trust-dot" aria-hidden="true" />
            <span>{{ t('trustAuto') }}</span>
          </div>
        </div>

        <!-- 订单元数据 -->
        <div v-if="orderData?.order_no" class="order-meta">
          <span>{{ t('merchantOrderNo') }}</span>
          <strong>{{ orderData.order_no }}</strong>
        </div>

        <!-- 浏览器收银台直连入口 -->
        <div v-if="!dualColumn && payMode === 'alipay' && orderData?.pay_url" class="account-pay-wrapper">
          <a
            :href="orderData.pay_url"
            target="_blank"
            rel="noopener noreferrer"
            class="account-pay-link"
          >
            <span>{{ t('cannotScan') }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5h11v11" />
              <path d="m19 5-13 13" />
            </svg>
          </a>
        </div>

        <!-- 返回重新选择套餐 -->
        <div v-if="orderData?.order_no" class="cancel-action-wrapper">
          <button type="button" class="back-link-btn" @click="$emit('cancelOrder')">
            {{ t('cancelPay') }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CreateOrderData } from '~/types/payment'
import { formatPrice } from '~/composables/usePackageDisplay'
import { useCheckoutI18n } from '~/composables/useCheckoutI18n'

const props = defineProps<{
  orderData: CreateOrderData | null
  qrDataUrl: string
  /** 二维码渲染异常（订单有效但图片生成失败），此时不能继续转圈 */
  qrRenderFailed?: boolean
  finalPrice: number
  pollingOrder?: boolean
  /** 该订单是否支持港币支付（后端未配置港币价或折扣后低于下限时为 false） */
  canUseStripe?: boolean
  /** 建单时冻结的港币金额（元） */
  hkdAmount?: number | null
  /** 跳转 Stripe 过程中禁用按钮，防重复点击 */
  redirectingStripe?: boolean
}>()

const emit = defineEmits<{
  (e: 'cancelOrder'): void
  (e: 'payStripe'): void
}>()

const { t, isEnglish } = useCheckoutI18n()

/**
 * 是否渲染英文左右双栏。
 *
 * 三个条件缺一不可：英文界面、后端为该订单冻结了港币金额（amount_hkd）、
 * 且该订单允许走 Stripe。任一不满足就退回单栏——此时英文用户看到的仍是
 * 「支付宝人民币 + 底部低调切换入口」，与中文界面行为一致。
 */
const dualColumn = computed(
  () => isEnglish.value && props.canUseStripe === true && typeof props.hkdAmount === 'number'
)

/**
 * 二维码不会出现（而不是「还在生成」）。
 *
 * 两种来源：后端根本没下发 qr_code（支付宝通道降级），或前端 Canvas 渲染抛错。
 * 正常链路上 dataURL 在切到本组件之前就已生成完毕，所以这里一旦成立，
 * 继续转圈就是让用户干等一张永远不会出现的图，必须改成明确说明并暴露其它出口。
 */
const qrUnavailable = computed(
  () => props.qrRenderFailed === true
    || (Boolean(props.orderData?.order_no) && !props.orderData?.qr_code)
)

/**
 * 支付方式视图（仅单栏模式使用）。
 *
 * 单栏默认支付宝人民币，海外用户在二维码下方主动切换才走港币；
 * 英文界面走 dualColumn 双栏，不经过这个状态。
 */
const payMode = ref<'alipay' | 'stripe'>('alipay')

/**
 * 收银台主标题（视觉 <h2> 与 <section aria-label> 唯一数据源）。
 */
const headerTitle = computed(() => {
  if (dualColumn.value) return t('dualHeaderTitle')
  if (payMode.value === 'stripe') return t('stripeTitle')
  return t('alipayTitle')
})

/** 兜底时长：后端未下发 expired_at 时按 30 分钟计，与服务端 ORDER_EXPIRE_MS 一致。 */
const FALLBACK_TTL_SECONDS = 30 * 60

function formatHkd(value: number): string {
  return value.toFixed(2).replace(/\.00$/, '')
}

/**
 * 依据后端下发的过期时间启动倒计时。
 *
 * 原实现硬编码 300 秒，比后端 30 分钟短得多；用户跳 Stripe 往返时会被前端
 * 提前判超时，所以改为跟随后端。
 */
function startCountdownFromExpiry(expiredAt?: number) {
  stopCountdown()
  const ttlMs = typeof expiredAt === 'number' && expiredAt > Date.now()
    ? expiredAt - Date.now()
    : FALLBACK_TTL_SECONDS * 1000
  countdownSeconds.value = Math.max(0, Math.floor(ttlMs / 1000))
  if (countdownSeconds.value <= 0) return

  timer = setInterval(() => {
    countdownSeconds.value--
    if (countdownSeconds.value <= 0) {
      countdownSeconds.value = 0
      stopCountdown()
    }
  }, 1000)
}

function stopCountdown() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/**
 * 切换视图**不**碰倒计时。
 *
 * 后端订单 30 分钟过期时间与 Stripe Session 的 expires_at 一直在走，本地暂停
 * 只会让用户高估剩余时间，在 Stripe 往返后反而被前端提前判超时。
 */
function switchToStripe() {
  payMode.value = 'stripe'
}

function switchBackToAlipay() {
  payMode.value = 'alipay'
}

const countdownSeconds = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

watch(
  () => [props.orderData?.order_no, props.orderData?.expired_at] as const,
  () => {
    startCountdownFromExpiry(props.orderData?.expired_at)
  },
)

onMounted(() => {
  startCountdownFromExpiry(props.orderData?.expired_at)
})

onBeforeUnmount(() => {
  stopCountdown()
})
</script>

<style scoped>
.state-payment {
  display: flex;
  justify-content: center;
  padding: 12px 16px 40px;
  width: 100%;
}

.payment-container {
  width: 100%;
  max-width: 460px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(22, 119, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 20px 48px rgba(22, 83, 160, 0.12), 0 4px 12px rgba(15, 23, 42, 0.04);
  text-align: center;
}

/* 英文双栏：左 Stripe（主推）略宽于右支付宝，让主推通道视觉重心更重 */
.payment-container--dual {
  max-width: 880px;
  text-align: left;
}

/* 双栏时改用中性深色 Header，避免整页被支付宝蓝盖过 Stripe 紫的主推位 */
.payment-header--dual {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.brand-block-text {
  min-width: 0;
}

/* ========== 英文左右双栏 ========== */

.dual-columns {
  display: grid;
  grid-template-columns: 1.08fr 1fr;
  gap: 24px;
  text-align: left;
}

.dual-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
}

.dual-col--stripe {
  border-color: rgba(99, 91, 255, 0.35);
  background: linear-gradient(180deg, rgba(99, 91, 255, 0.04) 0%, #ffffff 60%);
}

.dual-col--alipay {
  border-color: rgba(22, 119, 255, 0.24);
  background: linear-gradient(180deg, rgba(22, 119, 255, 0.04) 0%, #ffffff 60%);
}

.dual-col-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dual-col-head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dual-col-eyebrow {
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.01em;
}

.dual-col-ssl {
  font-size: 11.5px;
  font-weight: 600;
  color: #94a3b8;
}

.alipay-mark--sm {
  width: 34px;
  height: 34px;
  border-radius: 5.5px;
  background: #ffffff;
  color: #1677ff;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.22);
  flex: 0 0 auto;
}

.dual-amount {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
}

.dual-amount-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
}

.dual-amount-value {
  font-size: 32px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
}

.dual-col--stripe .dual-amount-value {
  color: #4f46e5;
}

.dual-col--alipay .dual-amount-value {
  color: #1677ff;
}

.dual-amount-note {
  font-size: 11.5px;
  line-height: 1.5;
  color: #718098;
}

.stripe-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.stripe-badge-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 32px;
  padding: 3px 5px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  flex: 0 0 auto;
}

.stripe-badge-chip--amex {
  padding: 0;
  background: #016fd0;
  border-color: #016fd0;
}

.stripe-method-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.qrcode-area--dual {
  margin-bottom: 0;
  text-align: center;
}

.dual-col--alipay .account-pay-link {
  margin-top: 0;
}

.dual-hint {
  margin: 16px 0 0;
  text-align: center;
  font-size: 12.5px;
  line-height: 1.6;
  color: #64748b;
}

/* 双栏在窄屏改为上下堆叠，Stripe 仍排在上方保持主推位 */
@media (max-width: 860px) {
  .dual-columns {
    grid-template-columns: 1fr;
  }
}

/* 经典支付宝官方深浅蓝渐变 Header */
.payment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 24px;
  color: #ffffff;
  background: linear-gradient(135deg, #1677ff 0%, #0b64d8 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* 单栏切换到 Stripe 视图时，顶栏同步切换为 Stripe 品牌紫渐变 */
.payment-header--stripe {
  background: linear-gradient(135deg, #635bff 0%, #4f46e5 100%);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  text-align: left;
}

.alipay-mark {
  width: 42px;
  height: 42px;
  border-radius: 7px;
  background: #1677ff;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  box-shadow: 0 8px 18px rgba(0, 39, 102, 0.18);
  user-select: none;
}

.alipay-mark--stripe {
  background: #ffffff;
  color: #635bff;
}

.brand-mark-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.brand-mark-svg--stripe {
  width: 24px;
  height: 24px;
}

.brand-name {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  opacity: 0.92;
  letter-spacing: 0.02em;
}

.payment-title {
  margin: 2px 0 0 0;
  color: #ffffff;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.security-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  min-height: 30px;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.security-badge svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.payment-body {
  padding: 24px 28px 28px;
}

/* 金额面板 */
.amount-panel {
  padding: 18px 16px 20px;
  margin-bottom: 20px;
  background: linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid rgba(22, 119, 255, 0.12);
}

.amount-panel--stripe {
  background: linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%);
  border-color: rgba(99, 91, 255, 0.22);
}

.payment-amount-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #5f6f89;
  margin-bottom: 4px;
}

.payment-amount-value {
  display: block;
  font-size: 38px;
  font-weight: 900;
  color: #1677ff;
  line-height: 1.15;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.amount-panel--stripe .payment-amount-value {
  color: #4f46e5;
}

.amount-note {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #718098;
  font-weight: 500;
}

/* 二维码展示区 */
.qrcode-area {
  margin-bottom: 20px;
}

.qrcode-wrapper {
  display: inline-block;
  position: relative;
  padding: 12px;
  background: #ffffff;
  border: 1px solid rgba(22, 119, 255, 0.24);
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(22, 119, 255, 0.1);
}

/* 科技感取景角标 */
.qrcode-wrapper::before,
.qrcode-wrapper::after {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  border-color: #1677ff;
  border-style: solid;
  pointer-events: none;
}

.qrcode-wrapper::before {
  top: 6px;
  left: 6px;
  border-width: 3px 0 0 3px;
  border-top-left-radius: 6px;
}

.qrcode-wrapper::after {
  right: 6px;
  bottom: 6px;
  border-width: 0 3px 3px 0;
  border-bottom-right-radius: 6px;
}

.qrcode-img {
  display: block;
  width: 200px;
  height: 200px;
  border-radius: 6px;
}

.qrcode-placeholder {
  width: 200px;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #64748b;
  font-size: 13px;
  background: #f8fafc;
  border-radius: 6px;
}

/*
 * 通道降级提示：占用与二维码相同的 200×200 盒位，降级瞬间不产生布局跳动。
 */
.qrcode-placeholder--notice {
  box-sizing: border-box;
  padding: 0 18px;
  line-height: 1.7;
  text-align: center;
  border: 1px dashed rgba(22, 119, 255, 0.28);
}

.spinner-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #1677ff;
  animation: pulse 1.2s ease-in-out infinite;
}

.payment-tip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  margin-top: 14px;
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(22, 119, 255, 0.08);
  border: 1px solid rgba(22, 119, 255, 0.16);
  color: #1677ff;
  font-size: 13.5px;
  font-weight: 700;
}

.payment-tip svg {
  flex-shrink: 0;
}

/* ========== 港币切换入口与 Stripe 视图 ========== */

/* 低调入口：不抢支付宝的视觉重心，悬停时才给出反馈 */
.stripe-switch-entry {
  display: block;
  width: 100%;
  margin: 12px 0 4px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.stripe-switch-entry:hover {
  color: #635bff;
  background: rgba(99, 91, 255, 0.06);
  border-radius: 8px;
}

.stripe-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 20px 0 12px;
}

.stripe-brand-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.stripe-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 11px;
  border-radius: 8px;
  background: #635bff;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(99, 91, 255, 0.24);
  flex: 0 0 auto;
}

.stripe-wordmark-svg {
  display: block;
  height: 20px;
  width: auto;
}

.stripe-panel .stripe-badge {
  height: 36px;
  padding: 0 14px;
}

.stripe-panel .stripe-wordmark-svg {
  height: 22px;
}

.stripe-methods {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}

.stripe-primary-btn {
  width: 100%;
  padding: 15px 20px;
  border: none;
  border-radius: 10px;
  background: #635bff;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.stripe-primary-btn:hover:not(:disabled) {
  background: #5851e8;
}

.stripe-primary-btn:disabled {
  background: #a5a1f0;
  cursor: not-allowed;
}

.stripe-back-btn {
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  cursor: pointer;
}

.stripe-back-btn:hover {
  color: #1677ff;
}

/* 倒计时面板 */
.countdown-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 10px 14px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: #f4f9ff;
  border: 1px solid rgba(22, 119, 255, 0.14);
  text-align: left;
}

.countdown-panel-expired {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.2);
}

.countdown-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(22, 119, 255, 0.12);
  color: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.countdown-panel-expired .countdown-icon {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

.countdown-icon svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.countdown-content {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.countdown-label {
  font-size: 13px;
  font-weight: 600;
  color: #5f6f89;
}

.countdown-time {
  font-size: 19px;
  font-weight: 700;
  color: #1677ff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.countdown-hint {
  font-size: 12px;
  color: #94a3b8;
}

.countdown-urgent {
  color: #ef4444;
  animation: pulse 1s ease-in-out infinite;
}

.countdown-expired {
  font-size: 14px;
  color: #ef4444;
  font-weight: 700;
}

/* 双重背书条 */
.trust-strip {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.trust-item {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-size: 12.5px;
  font-weight: 600;
}

.trust-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
  flex: 0 0 auto;
}

/* 订单元数据 */
.order-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0 14px;
  color: #64748b;
  font-size: 13px;
  border-top: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
}

.order-meta strong {
  min-width: 0;
  color: #1e293b;
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
  text-align: right;
}

/* 备用支付入口 */
.account-pay-wrapper {
  margin: 16px 0 10px;
}

.account-pay-link {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 9px 14px;
  border-radius: 9px;
  border: 1.5px solid rgba(22, 119, 255, 0.25);
  background: rgba(22, 119, 255, 0.05);
  color: #1677ff;
  font-size: 13.5px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.account-pay-link svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.2s ease;
}

.account-pay-link:hover {
  background: rgba(22, 119, 255, 0.1);
  border-color: rgba(22, 119, 255, 0.4);
  color: #0b64d8;
}

.account-pay-link:hover svg {
  transform: translate(2px, -2px);
}

.cancel-action-wrapper {
  margin-top: 6px;
}

.back-link-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  padding: 6px 12px;
  transition: color 0.15s ease;
}

.back-link-btn:hover {
  color: #1677ff;
  text-decoration: underline;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.4s ease forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 520px) {
  .state-payment {
    padding: 8px 8px 32px;
  }

  .payment-header {
    padding: 16px;
    align-items: flex-start;
  }

  .payment-body {
    padding: 18px 16px 22px;
  }

  .payment-title {
    font-size: 17px;
  }

  .payment-amount-value {
    font-size: 32px;
  }

  .trust-strip {
    grid-template-columns: 1fr;
  }

  .order-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .order-meta strong {
    text-align: left;
  }
}
</style>
