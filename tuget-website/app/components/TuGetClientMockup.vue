<template>
  <div class="tuget-app-window" :aria-label="t('mockup.ariaLabel')">
    <!-- Desktop Titlebar (Windows 11 frame) -->
    <div class="tuget-titlebar">
      <div class="tuget-titlebar-left">
        <img src="/tuget-icon.svg" width="16" height="16" alt="TuGet" class="tuget-title-icon" />
        <span class="tuget-title-text">{{ t('mockup.winTitle') }}</span>
        <span class="tuget-title-sub">{{ t('mockup.winSub') }}</span>
      </div>
      <div class="tuget-win-controls">
        <span class="tuget-win-btn">—</span>
        <span class="tuget-win-btn">□</span>
        <span class="tuget-win-btn tuget-win-btn--close">✕</span>
      </div>
    </div>

    <!-- App Shell: Exact TuGet-Client layout (230px Sidebar + Workspace) -->
    <div class="tuget-app-shell">
      <!-- Sidebar (Exact TuGet-Client AppSidebar.vue) -->
      <aside class="tuget-sidebar">
        <!-- Brand Section -->
        <div class="tuget-brand">
          <div class="tuget-brand-mark">
            <img src="/tuget-icon.svg" width="28" height="28" alt="TuGet" class="tuget-brand-icon" />
          </div>
          <div class="tuget-brand-info">
            <strong class="tuget-brand-title">TuGet</strong>
            <span class="tuget-brand-sub">{{ t('mockup.brandSub') }}</span>
          </div>
        </div>

        <!-- Navigation List -->
        <nav class="tuget-nav-list">
          <div class="tuget-nav-group">
            <div class="tuget-nav-item tuget-nav-item--active">
              <span class="tuget-nav-icon-box">
                <svg class="tuget-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 8V4h4" />
                  <path d="M20 8V4h-4" />
                  <path d="M4 16v4h4" />
                  <path d="M20 16v4h-4" />
                  <circle cx="12" cy="12" r="3.5" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                </svg>
              </span>
              <span class="tuget-nav-label">{{ t('mockup.navConsole') }}</span>
            </div>
          </div>

          <div class="tuget-nav-group">
            <p class="tuget-nav-section-label">{{ t('mockup.navResults') }}</p>

            <!-- Line A: 电商专用 -->
            <div class="tuget-nav-item">
              <span class="tuget-nav-icon-box">
                <svg class="tuget-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </span>
              <span class="tuget-nav-label">{{ t('mockup.navEcommerce') }}</span>
              <div class="tuget-nav-meta">
                <span class="tuget-channel-badge tuget-channel-badge--a" :title="t('mockup.navEcommerceTitle')">A</span>
                <span class="tuget-nav-count">128</span>
              </div>
            </div>

            <!-- Line B: 通用媒体 -->
            <div class="tuget-nav-item">
              <span class="tuget-nav-icon-box">
                <svg class="tuget-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="4" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </span>
              <span class="tuget-nav-label">{{ t('mockup.navMedia') }}</span>
              <div class="tuget-nav-meta">
                <span class="tuget-channel-badge tuget-channel-badge--b" :title="t('mockup.navMediaTitle')">B</span>
                <span class="tuget-nav-count">45</span>
              </div>
            </div>

            <!-- Line C: 备用提取1 -->
            <div class="tuget-nav-item">
              <span class="tuget-nav-icon-box">
                <svg class="tuget-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </span>
              <span class="tuget-nav-label">{{ t('mockup.navBackup') }}</span>
              <div class="tuget-nav-meta">
                <span class="tuget-channel-badge tuget-channel-badge--c" :title="t('mockup.navBackupTitle')">C</span>
                <span class="tuget-nav-count">12</span>
              </div>
            </div>
          </div>

          <div class="tuget-nav-group">
            <p class="tuget-nav-section-label">{{ t('mockup.navManage') }}</p>
            <div class="tuget-nav-item">
              <span class="tuget-nav-icon-box">
                <svg class="tuget-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
              </span>
              <span class="tuget-nav-label">{{ t('mockup.navDownloads') }}</span>
            </div>

            <div class="tuget-nav-item">
              <span class="tuget-nav-icon-box">
                <svg class="tuget-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  <path d="M5 3v4" />
                  <path d="M7 5H3" />
                </svg>
              </span>
              <span class="tuget-nav-label">{{ t('mockup.navCache') }}</span>
              <span class="tuget-nav-cache-badge">1.2 GB</span>
            </div>
          </div>
        </nav>

        <!-- Engine Card (Exact TuGet-Client bottom widget) -->
        <div class="tuget-engine-card">
          <div class="tuget-engine-header">
            <div class="tuget-engine-status">
              <span class="tuget-status-dot tuget-status-dot--ready" />
              <span class="tuget-engine-title">{{ t('mockup.engineConnected') }}</span>
            </div>
            <span class="tuget-version-tag">v1.8.2</span>
          </div>

          <div class="tuget-engine-details">
            <div class="tuget-engine-row">
              <span class="tuget-detail-label">{{ t('mockup.engineBrowser') }}</span>
              <span class="tuget-detail-badge">{{ t('mockup.engineRunning') }}</span>
            </div>
          </div>

          <button type="button" class="tuget-restart-btn">
            <svg class="tuget-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            <span>{{ t('mockup.engineRestart') }}</span>
          </button>
        </div>
      </aside>

      <!-- Central Workspace (Exact TuGet-Client styles and elements) -->
      <main class="tuget-workspace">
        <!-- Topbar -->
        <header class="tuget-topbar">
          <div>
            <p class="tuget-eyebrow">{{ t('mockup.eyebrow') }}</p>
            <h1 class="tuget-page-title">{{ t('mockup.pageTitle') }}</h1>
          </div>
          <div class="tuget-topbar-stats">
            <span>{{ t('mockup.statTasks') }}</span>
            <span>{{ t('mockup.statResources') }}</span>
          </div>
        </header>

        <!-- Capture Card (Forms) -->
        <section class="tuget-capture-card">
          <div class="tuget-url-header-row">
            <label class="tuget-url-label">{{ t('mockup.urlLabel') }}</label>
            <div class="tuget-mode-segmented">
              <button type="button" class="tuget-mode-btn">{{ t('mockup.modeSingle') }}</button>
              <button type="button" class="tuget-mode-btn tuget-mode-btn--selected">{{ t('mockup.modeBatch') }}</button>
            </div>
          </div>

          <div class="tuget-textarea-box">
            <div class="tuget-url-line">https://detail.1688.com/offer/683920194821.html</div>
            <div class="tuget-url-line">https://item.taobao.com/item.htm?id=7829410928</div>
            <div class="tuget-url-line">https://www.bilibili.com/video/BV1xx411c7mD</div>
          </div>

          <!-- Options Row -->
          <div class="tuget-options-row">
            <div class="tuget-options-meta">
              <span class="tuget-opt-pill">{{ t('mockup.optDeep') }}</span>
              <span class="tuget-opt-pill">{{ t('mockup.optAutoSave') }}</span>
              <span class="tuget-opt-pill">{{ t('mockup.optConcurrency') }}</span>
            </div>
            <button type="button" class="tuget-submit-btn">
              {{ t('mockup.submitBtn') }}
            </button>
          </div>
        </section>

        <!-- Task List Section -->
        <section class="tuget-task-section">
          <div class="tuget-task-header">
            <strong class="tuget-task-section-title">{{ t('mockup.queueTitle') }}</strong>
            <span class="tuget-task-section-sub">{{ t('mockup.queueSub') }}</span>
          </div>

          <div class="tuget-task-list">
            <!-- Task 1: 1688 Anti-Scraping Line A -->
            <article class="tuget-task-row">
              <div class="tuget-task-brand tuget-task-brand--1688">
                <span>1688</span>
              </div>
              <div class="tuget-task-main">
                <div class="tuget-task-title-row">
                  <span class="tuget-task-site-badge tuget-task-site-badge--1688">{{ t('mockup.task1Badge') }}</span>
                  <strong class="tuget-task-title-text">{{ t('mockup.task1Title') }}</strong>
                  <span class="tuget-task-open-hint">{{ t('mockup.task1Open') }}</span>
                </div>
                <div class="tuget-task-url-text">https://detail.1688.com/offer/683920194821.html</div>
                <div class="tuget-task-channels">
                  <span class="tuget-channel-chip tuget-channel-chip--a">
                    <b>A</b> {{ t('mockup.navEcommerce') }} <small>{{ t('mockup.task1ChACount') }}</small>
                  </span>
                  <span class="tuget-channel-chip tuget-channel-chip--b">
                    <b>B</b> {{ t('mockup.navMedia') }} <small>{{ t('mockup.task1ChBCount') }}</small>
                  </span>
                </div>
                <div class="tuget-save-summary tuget-save-summary--success">
                  <span>{{ t('mockup.task1Summary') }}</span>
                </div>
              </div>
              <div class="tuget-task-right-col">
                <span class="tuget-status-badge tuget-status-badge--success">{{ t('mockup.task1Status') }}</span>
                <span class="tuget-resource-count"><strong>43</strong> {{ t('mockup.taskResUnit') }}</span>
              </div>
            </article>

            <!-- Task 2: m3u8 Media Stream Line B -->
            <article class="tuget-task-row">
              <div class="tuget-task-brand tuget-task-brand--media">
                <span>{{ t('mockup.task2Brand') }}</span>
              </div>
              <div class="tuget-task-main">
                <div class="tuget-task-title-row">
                  <span class="tuget-task-site-badge tuget-task-site-badge--media">{{ t('mockup.task2Badge') }}</span>
                  <strong class="tuget-task-title-text">{{ t('mockup.task2Title') }}</strong>
                  <span class="tuget-task-open-hint">{{ t('mockup.task1Open') }}</span>
                </div>
                <div class="tuget-task-url-text">https://www.bilibili.com/video/BV1xx411c7mD</div>
                <div class="tuget-task-channels">
                  <span class="tuget-channel-chip tuget-channel-chip--b">
                    <b>B</b> {{ t('mockup.navMedia') }} <small>{{ t('mockup.task2ChBCount') }}</small>
                  </span>
                </div>
                <div class="tuget-progress-track">
                  <div class="tuget-progress-fill" style="width: 84%;" />
                </div>
                <div class="tuget-save-summary tuget-save-summary--active">
                  <span>{{ t('mockup.task2Summary') }}</span>
                </div>
              </div>
              <div class="tuget-task-right-col">
                <span class="tuget-status-badge tuget-status-badge--active">{{ t('mockup.task2Status') }}</span>
                <span class="tuget-resource-count"><strong>18</strong> {{ t('mockup.taskResUnit') }}</span>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>

<style scoped>
/* TuGet-Client Design System: Light Slate & Emerald Green Tokens */
.tuget-app-window {
  --color-primary: #059669;
  --color-primary-hover: #047857;
  --color-primary-subtle: #ecfdf5;
  --color-primary-border: #a7f3d0;
  --color-primary-text: #065f46;

  --color-bg-app: #f8fafc;
  --color-bg-surface: #ffffff;
  --color-bg-subtle: #f1f5f9;

  --color-border: #e2e8f0;
  --color-border-subtle: #edf2f7;

  --color-text-main: #0f172a;
  --color-text-secondary: #334155;
  --color-text-muted: #64748b;

  background: var(--color-bg-app);
  color: var(--color-text-main);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 16px 36px -10px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.04);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  text-align: left;
  height: 486px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* Titlebar */
.tuget-titlebar {
  height: 36px;
  flex-shrink: 0;
  background: #ffffff;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  user-select: none;
}

.tuget-titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tuget-title-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-main);
}

.tuget-title-sub {
  font-size: 11px;
  color: var(--color-primary);
  font-weight: 600;
  background: var(--color-primary-subtle);
  border: 1px solid var(--color-primary-border);
  padding: 1px 6px;
  border-radius: 4px;
}

.tuget-win-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 12px;
}

.tuget-win-btn {
  line-height: 1;
}

/* App Shell Layout */
.tuget-app-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  flex: 1;
  min-height: 0;
  height: calc(486px - 36px);
  overflow: hidden;
  background: var(--color-bg-app);
}

/* Sidebar */
.tuget-sidebar {
  background: var(--color-bg-surface);
  border-right: 1px solid var(--color-border);
  padding: 12px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
}

.tuget-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 2px 4px 12px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.tuget-brand-mark {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.tuget-brand-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.tuget-brand-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-main);
}

.tuget-brand-sub {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
}

/* Navigation List */
.tuget-nav-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.tuget-nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tuget-nav-section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 6px 2px;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.tuget-nav-section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border-subtle);
}

.tuget-nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  border: 1px solid transparent;
  user-select: none;
}

.tuget-nav-item--active {
  color: var(--color-primary-text);
  font-weight: 600;
  background: var(--color-primary-subtle);
  border-color: var(--color-primary-border);
}

.tuget-nav-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 5px;
  bottom: 5px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--color-primary);
}

.tuget-nav-icon-box {
  width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.tuget-nav-icon {
  width: 15px;
  height: 15px;
  color: var(--color-text-muted);
}

.tuget-nav-item--active .tuget-nav-icon {
  color: var(--color-primary);
}

.tuget-nav-label {
  flex: 1;
  min-width: 0;
}

.tuget-nav-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
}

.tuget-channel-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
  font-family: ui-monospace, monospace;
}

.tuget-channel-badge--a {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.tuget-channel-badge--b {
  background: #e0f2fe;
  color: #0284c7;
  border: 1px solid #bae6fd;
}

.tuget-channel-badge--c {
  background: #fef3c7;
  color: #d97706;
  border: 1px solid #fde68a;
}

.tuget-nav-count {
  font-size: 11px;
  font-weight: 600;
  font-family: ui-monospace, monospace;
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--color-text-muted);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
}

.tuget-nav-cache-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--color-bg-subtle);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

/* Engine Card */
.tuget-engine-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.tuget-engine-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tuget-engine-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tuget-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary);
}

.tuget-engine-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-main);
}

.tuget-version-tag {
  font-size: 10px;
  font-weight: 600;
  font-family: ui-monospace, monospace;
  color: var(--color-primary-text);
  background: var(--color-primary-subtle);
  border: 1px solid var(--color-primary-border);
  padding: 1px 5px;
  border-radius: 3px;
}

.tuget-engine-details {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
  border-radius: 4px;
  padding: 4px 6px;
}

.tuget-engine-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.tuget-detail-label {
  color: var(--color-text-muted);
}

.tuget-detail-badge {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.tuget-restart-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  height: 26px;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 500;
  cursor: default;
}

.tuget-btn-icon {
  width: 12px;
  height: 12px;
}

/* Central Workspace */
.tuget-workspace {
  padding: 13px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
}

.tuget-workspace::-webkit-scrollbar,
.tuget-sidebar::-webkit-scrollbar {
  width: 5px;
}

.tuget-workspace::-webkit-scrollbar-thumb,
.tuget-sidebar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.tuget-workspace::-webkit-scrollbar-track,
.tuget-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.tuget-topbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
}

.tuget-eyebrow {
  margin: 0 0 2px;
  color: var(--color-primary-text);
  font-size: 11px;
  font-weight: 600;
}

.tuget-page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-main);
}

.tuget-topbar-stats {
  display: flex;
  gap: 12px;
  color: var(--color-text-muted);
  font-size: 12px;
}

.tuget-topbar-stats span + span {
  padding-left: 12px;
  border-left: 1px solid var(--color-border);
}

/* Capture Card */
.tuget-capture-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.tuget-url-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tuget-url-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.tuget-mode-segmented {
  display: flex;
  gap: 2px;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 2px;
}

.tuget-mode-btn {
  border: none;
  background: transparent;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: default;
}

.tuget-mode-btn--selected {
  background: #ffffff;
  color: var(--color-primary);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.tuget-textarea-box {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  color: var(--color-text-secondary);
}

.tuget-url-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tuget-options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}

.tuget-options-meta {
  display: flex;
  gap: 6px;
}

.tuget-opt-pill {
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-bg-subtle);
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
}

.tuget-submit-btn {
  background: var(--color-primary);
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
}

/* Task Section */
.tuget-task-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tuget-task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
}

.tuget-task-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-main);
}

.tuget-task-section-sub {
  font-size: 11px;
  color: var(--color-text-muted);
}

.tuget-task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tuget-task-row {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.tuget-task-brand {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
}

.tuget-task-brand--1688 {
  background: #fff7ed;
  color: #ea580c;
  border: 1px solid #fed7aa;
}

.tuget-task-brand--media {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.tuget-task-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tuget-task-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tuget-task-site-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}

.tuget-task-site-badge--1688 {
  background: #fff7ed;
  color: #ea580c;
  border: 1px solid #fed7aa;
}

.tuget-task-site-badge--media {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.tuget-task-title-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tuget-task-open-hint {
  font-size: 11px;
  color: var(--color-primary);
  font-weight: 600;
  margin-left: 4px;
}

.tuget-task-url-text {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: ui-monospace, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tuget-task-channels {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}

.tuget-channel-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.tuget-channel-chip--a b {
  color: #dc2626;
}

.tuget-channel-chip--b b {
  color: #0284c7;
}

.tuget-channel-chip small {
  color: var(--color-primary);
  font-weight: 600;
}

.tuget-progress-track {
  height: 4px;
  background: var(--color-bg-subtle);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.tuget-progress-fill {
  height: 100%;
  background: var(--color-primary);
}

.tuget-save-summary {
  font-size: 11px;
  margin-top: 2px;
}

.tuget-save-summary--success {
  color: var(--color-primary-text);
  font-weight: 500;
}

.tuget-save-summary--active {
  color: #0284c7;
  font-weight: 500;
}

.tuget-task-right-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.tuget-status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
}

.tuget-status-badge--success {
  background: var(--color-primary-subtle);
  color: var(--color-primary-text);
  border: 1px solid var(--color-primary-border);
}

.tuget-status-badge--active {
  background: #e0f2fe;
  color: #0284c7;
  border: 1px solid #bae6fd;
}

.tuget-resource-count {
  font-size: 11px;
  color: var(--color-text-muted);
}

.tuget-resource-count strong {
  color: var(--color-text-main);
  font-size: 13px;
}

@media (max-width: 768px) {
  .tuget-app-shell {
    grid-template-columns: 1fr;
  }
  .tuget-sidebar {
    display: none;
  }
}
</style>
