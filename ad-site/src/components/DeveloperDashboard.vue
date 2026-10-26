<template>
  <div class="dev-dashboard">
    <!-- 未登录状态：管理员账号密码验证锁屏 -->
    <div v-if="!isAuthenticated" class="login-gate">
      <form class="login-card" @submit.prevent="handleLogin">
        <div class="login-header">
          <div class="lock-icon">🔒</div>
          <h1>管理后台验证</h1>
          <p>请输入管理员账号与密码以访问 1~8 广告位控制台</p>
        </div>

        <div class="form-group">
          <label for="admin-username">管理员账号</label>
          <input
            id="admin-username"
            v-model.trim="loginForm.username"
            type="text"
            autocomplete="username"
            placeholder="请输入管理员用户名"
            required
          />
        </div>

        <div class="form-group">
          <label for="admin-password">管理员密码</label>
          <input
            id="admin-password"
            v-model="loginForm.password"
            type="password"
            autocomplete="current-password"
            placeholder="请输入管理员密码"
            required
          />
        </div>

        <div v-if="loginError" class="login-error">
          {{ loginError }}
        </div>

        <button type="submit" class="login-submit-btn" :disabled="isLoggingIn">
          {{ isLoggingIn ? '验证中...' : '登录进入管理后台' }}
        </button>
      </form>
    </div>

    <!-- 已登录状态：1~8 可视化调节与实时预览后台 -->
    <template v-else>
      <header class="header">
        <div class="title-group">
          <h1>接口预览与 1~8 排序管理后台</h1>
          <p>
            直接下拉调节 <strong>#1 ~ #8</strong> 对应的资源池编号（A~{{ lastPoolKey }}），修改后<strong>线上全网立即生效</strong>
          </p>
        </div>

        <div class="header-right">
          <div class="header-actions">
            <div class="save-status-badge" :class="saveStatus.type">
              <span class="status-dot"></span>
              <span>{{ saveStatus.text }}</span>
            </div>
            <button type="button" class="logout-btn" @click="handleLogout()">
              退出登录 ({{ adminUsername || '管理员' }})
            </button>
          </div>
          <div class="url-hint">
            基准地址: <code>{{ baseUrl }}</code>
          </div>
        </div>
      </header>

      <div class="content-grid">
        <!-- 左栏：1~8 核心映射调节控制台 -->
        <section class="panel-column mapping-panel">
          <div class="panel-header">
            <div>
              <h2>🎛️ 1 ~ 8 展示位调节</h2>
              <p class="panel-subtitle">选择下拉框即自动同步到线上服务器并右侧预览</p>
            </div>
            <button
              type="button"
              class="save-btn"
              :disabled="isSaving"
              @click="persistMapping('手动保存全部 1~8 映射')"
            >
              {{ isSaving ? '同步中...' : '立即同步线上' }}
            </button>
          </div>

          <div class="slot-list">
            <div
              v-for="slot in SLOT_KEYS"
              :key="slot"
              class="slot-card"
              :class="{
                active: String(activeId) === slot,
                'just-updated': lastUpdatedSlot === slot,
              }"
              @click="activeId = slot"
            >
              <div class="slot-top">
                <div class="slot-title-group">
                  <span class="slot-number">#{{ slot }}</span>
                  <span class="slot-scene">{{ SLOT_SCENE_LABELS[slot] }}</span>
                </div>
                <div class="slot-current-badge" :class="getPoolContentType(slotMappings[slot])">
                  当前: <strong>{{ slotMappings[slot] }}</strong> · {{ getContentTypeLabel(slotMappings[slot]) }}
                </div>
              </div>

              <div class="slot-control" @click.stop>
                <label :for="`slot-select-${slot}`" class="sr-only">选择 #{{ slot }} 对应的配置</label>
                <select
                  :id="`slot-select-${slot}`"
                  class="slot-select"
                  :value="slotMappings[slot]"
                  @change="handleSlotChange(slot, ($event.target as HTMLSelectElement).value)"
                >
                  <option
                    v-for="poolItem in poolEntries"
                    :key="poolItem.key"
                    :value="poolItem.key"
                  >
                    {{ poolItem.key }} — {{ poolItem.config.name }} ({{ getContentTypeLabel(poolItem.key) }})
                  </option>
                </select>
              </div>

              <div class="slot-desc">
                <span class="slot-desc-text">{{ getPoolConfig(slotMappings[slot])?.description }}</span>
                <span class="slot-preview-hint">点击预览 →</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 中栏：A~P 资源配置池参考与直连预览 -->
        <aside class="panel-column pool-panel">
          <div class="panel-header">
            <div>
              <h2>📦 资源配置池 (A ~ {{ lastPoolKey }})</h2>
              <p class="panel-subtitle">候选内容库，点击可单独预览效果</p>
            </div>
          </div>

          <div class="pool-list">
            <div
              v-for="poolItem in poolEntries"
              :key="poolItem.key"
              class="pool-card"
              :class="{ active: String(activeId) === `e${poolItem.key}` }"
              @click="activeId = `e${poolItem.key}`"
            >
              <div class="pool-letter-badge" :class="getPoolContentType(poolItem.key)">
                {{ poolItem.key }}
              </div>
              <div class="pool-info">
                <div class="pool-title-row">
                  <span class="pool-name">{{ poolItem.config.name }}</span>
                  <span class="pool-type-tag" :class="getPoolContentType(poolItem.key)">
                    {{ getContentTypeLabel(poolItem.key) }}
                  </span>
                </div>
                <div class="pool-desc" :title="poolItem.config.description">
                  {{ poolItem.config.description }}
                </div>
                <div v-if="usedBySlotsMap[poolItem.key]?.length" class="pool-used-by">
                  正用于:
                  <span
                    v-for="usedSlot in usedBySlotsMap[poolItem.key]"
                    :key="usedSlot"
                    class="used-slot-pill"
                  >
                    #{{ usedSlot }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- 右栏：实时效果预览 -->
        <main class="preview-area">
          <div class="preview-header" v-if="activeConfig">
            <div class="preview-header-top">
              <div>
                <h2>
                  {{ activeConfig.name }} 预览
                  <span class="preview-sub-badge">
                    rankType={{ activeId }}
                    <template v-if="isNumericSlot(activeId)">
                      → 对应字母 {{ slotMappings[String(activeId)] }}
                    </template>
                  </span>
                </h2>
                <div class="iframe-command">
                  代码片段: <code>&lt;iframe src="{{ baseUrl }}?rankType={{ activeId }}"&gt;&lt;/iframe&gt;</code>
                </div>
              </div>
              <button type="button" class="refresh-preview-btn" @click="previewRefreshKey++">
                刷新预览
              </button>
            </div>
          </div>

          <div class="iframe-wrapper">
            <ProductRecommendation
              v-if="activeId"
              :key="previewRenderKey"
              :rankType="activeId"
              width="225px"
              height="100%"
            />
            <div v-else class="empty-state">
              请从左侧选择一个接口进行预览
            </div>
          </div>
        </main>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { RANK_POOL, RANK_MAPPING, RANK_LIST_CONFIG, type RankConfig } from '../config/rankConfig';
import { AD_RANK_API_BASE, applyRankMappingInMemory } from '@/utils/remoteRankMapping';
import ProductRecommendation from './ProductRecommendation.vue';

const TOKEN_STORAGE_KEY = 'ad_site_admin_token';
const USERNAME_STORAGE_KEY = 'ad_site_admin_username';
const SLOT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

const SLOT_SCENE_LABELS: Record<string, string> = {
  '1': '主图页 · 位置1',
  '2': '主图页 · 位置2',
  '3': 'SKU页 · 位置1',
  '4': 'SKU页 · 位置2',
  '5': '详情图 · 位置1',
  '6': '详情图 · 位置2',
  '7': '视频页 · 位置1',
  '8': '视频页 · 位置2',
};

const adminToken = ref<string>(localStorage.getItem(TOKEN_STORAGE_KEY) || '');
const adminUsername = ref<string>(localStorage.getItem(USERNAME_STORAGE_KEY) || '');
const isAuthenticated = computed(() => Boolean(adminToken.value));

const loginForm = reactive({
  username: adminUsername.value || 'admin',
  password: '',
});
const isLoggingIn = ref(false);
const loginError = ref('');

const activeId = ref<string | number>('1');
const previewRefreshKey = ref(0);
const lastUpdatedSlot = ref<string | null>(null);
const isSaving = ref(false);
const baseUrl = window.location.origin + window.location.pathname;

// 响应式维护 1~8 的映射关系
const slotMappings = reactive<Record<string, string>>({
  '1': RANK_MAPPING['1'] || 'A',
  '2': RANK_MAPPING['2'] || 'G',
  '3': RANK_MAPPING['3'] || 'D',
  '4': RANK_MAPPING['4'] || 'F',
  '5': RANK_MAPPING['5'] || 'C',
  '6': RANK_MAPPING['6'] || 'F',
  '7': RANK_MAPPING['7'] || 'B',
  '8': RANK_MAPPING['8'] || 'H',
});

const saveStatus = ref<{
  type: 'ready' | 'saving' | 'success' | 'error';
  text: string;
}>({
  type: 'ready',
  text: '正在同步线上当前配置...',
});

const poolEntries = computed(() =>
  Object.entries(RANK_POOL).map(([key, config]) => ({
    key,
    config,
  })),
);

const lastPoolKey = computed(() => {
  const keys = Object.keys(RANK_POOL);
  return keys[keys.length - 1] || 'P';
});

const usedBySlotsMap = computed(() => {
  const result: Record<string, string[]> = {};
  for (const slot of SLOT_KEYS) {
    const letter = slotMappings[slot];
    if (!letter) continue;
    if (!result[letter]) result[letter] = [];
    result[letter].push(slot);
  }
  return result;
});

const getPoolConfig = (poolKey: string | undefined) => {
  if (!poolKey) return undefined;
  return RANK_POOL[poolKey];
};

const getPoolContentType = (poolKey: string | undefined): string => {
  const type = getPoolConfig(poolKey)?.contentType || 'api';
  return `type-${type}`;
};

const getContentTypeLabel = (poolKey: string | undefined): string => {
  const type = getPoolConfig(poolKey)?.contentType || 'api';
  switch (type) {
    case 'image':
      return '图片海报';
    case 'iframe':
      return 'iframe页';
    case 'html':
      return 'HTML卡片';
    default:
      return 'API榜单';
  }
};

const isNumericSlot = (id: string | number): boolean => {
  return SLOT_KEYS.includes(String(id) as (typeof SLOT_KEYS)[number]);
};

const activeConfig = computed<RankConfig | undefined>(() => {
  const key = String(activeId.value);
  if (isNumericSlot(key)) {
    const poolKey = slotMappings[key];
    const poolTarget = poolKey ? RANK_POOL[poolKey] : undefined;
    if (poolTarget) {
      return {
        id: key,
        ...poolTarget,
      };
    }
  }
  return RANK_LIST_CONFIG[key];
});

const previewRenderKey = computed(() => {
  const key = String(activeId.value);
  const mappedLetter = isNumericSlot(key) ? slotMappings[key] : key;
  return `${key}-${mappedLetter}-${previewRefreshKey.value}`;
});

const formatTime = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const syncLocalDict = (incoming: Record<string, string>) => {
  for (const slot of SLOT_KEYS) {
    const poolKey = incoming[slot];
    if (poolKey && poolKey in RANK_POOL) {
      slotMappings[slot] = poolKey;
    }
  }
  applyRankMappingInMemory(incoming);
};

// 从线上服务器加载最新 1~8 映射并验证 Token
const loadOnlineMapping = async () => {
  if (!adminToken.value) return;
  try {
    const response = await fetch(`${AD_RANK_API_BASE}/api/admin/ad-rank-mapping`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken.value}`,
      },
      cache: 'no-store',
    });

    if (response.status === 401) {
      handleLogout('登录已过期，请重新输入密码');
      return;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { mapping?: Record<string, string> };
      message?: string;
    };

    if (response.ok && payload.success && payload.data?.mapping) {
      syncLocalDict(payload.data.mapping);
      saveStatus.value = {
        type: 'ready',
        text: '已连接线上服务器：下拉修改即全网实时生效',
      };
    } else {
      saveStatus.value = {
        type: 'ready',
        text: '已就绪：下拉选择即同步保存',
      };
    }
  } catch {
    saveStatus.value = {
      type: 'ready',
      text: '已加载本地配置，下拉修改后将尝试同步线上',
    };
  }
};

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    loginError.value = '请输入管理员账号和密码';
    return;
  }

  isLoggingIn.value = true;
  loginError.value = '';

  try {
    const response = await fetch(`${AD_RANK_API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: loginForm.username,
        password: loginForm.password,
      }),
    });

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { token?: string };
      message?: string;
    };

    if (!response.ok || !payload.success || !payload.data?.token) {
      loginError.value = payload.message || '账号或密码错误';
      return;
    }

    adminToken.value = payload.data.token;
    adminUsername.value = loginForm.username;
    localStorage.setItem(TOKEN_STORAGE_KEY, payload.data.token);
    localStorage.setItem(USERNAME_STORAGE_KEY, loginForm.username);
    loginForm.password = '';

    await loadOnlineMapping();
  } catch (error) {
    loginError.value = error instanceof Error ? `登录请求失败: ${error.message}` : '网络错误，请稍后重试';
  } finally {
    isLoggingIn.value = false;
  }
};

const handleLogout = (reason = '') => {
  adminToken.value = '';
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  loginError.value = reason;
};

const persistMapping = async (actionDesc: string) => {
  isSaving.value = true;
  saveStatus.value = {
    type: 'saving',
    text: `正在同步到线上服务器 (${actionDesc})...`,
  };

  let onlineSaved = false;
  let localSaved = false;
  let errorDetail = '';

  // 1. 同步写入线上服务器 (api.downpictures.com)，全网立即生效
  try {
    const response = await fetch(`${AD_RANK_API_BASE}/api/admin/ad-rank-mapping`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken.value}`,
      },
      body: JSON.stringify({
        mapping: { ...slotMappings },
      }),
    });

    if (response.status === 401) {
      handleLogout('登录已过期，请重新登录');
      isSaving.value = false;
      return;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { mapping?: Record<string, string> };
      message?: string;
    };

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }

    if (payload.data?.mapping) {
      syncLocalDict(payload.data.mapping);
    }
    onlineSaved = true;
  } catch (error) {
    errorDetail = error instanceof Error ? error.message : '线上同步失败';
  }

  // 2. 如果是本地开发环境 (localhost:5188)，同时自动写回本地 src/config/rankConfig.ts
  if (import.meta.env.DEV) {
    try {
      const devRes = await fetch('/__dev/rank-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping: { ...slotMappings } }),
      });
      if (devRes.ok) {
        localSaved = true;
      }
    } catch {
      // 忽略本地写文件异常
    }
  }

  if (onlineSaved) {
    saveStatus.value = {
      type: 'success',
      text: localSaved
        ? `✅ 线上已全网生效 + 本地源码已更新 · ${actionDesc} (${formatTime(new Date())})`
        : `✅ 线上已全网实时生效 · ${actionDesc} (${formatTime(new Date())})`,
    };
  } else if (localSaved) {
    saveStatus.value = {
      type: 'success',
      text: `已写入本地 rankConfig.ts（线上同步未完成: ${errorDetail}）`,
    };
  } else {
    saveStatus.value = {
      type: 'error',
      text: `保存失败: ${errorDetail}`,
    };
  }

  isSaving.value = false;
};

const handleSlotChange = (slot: string, newPoolKey: string) => {
  if (!RANK_POOL[newPoolKey]) return;

  slotMappings[slot] = newPoolKey;
  applyRankMappingInMemory({ ...slotMappings });

  activeId.value = slot;
  lastUpdatedSlot.value = slot;

  const targetName = RANK_POOL[newPoolKey].name;
  void persistMapping(`#${slot} → ${newPoolKey} (${targetName})`);
};

onMounted(() => {
  if (adminToken.value) {
    void loadOnlineMapping();
  }
});
</script>

<style scoped>
.dev-dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
  color: #1f2937;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* 登录门禁样式 */
.login-gate {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.login-header {
  text-align: center;
}

.lock-icon {
  font-size: 2rem;
  margin-bottom: 0.4rem;
}

.login-header h1 {
  margin: 0;
  font-size: 1.3rem;
  color: #0f172a;
}

.login-header p {
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
  color: #64748b;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
}

.form-group input {
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-group input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.login-error {
  font-size: 0.82rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
}

.login-submit-btn {
  padding: 0.65rem 1rem;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  font-size: 0.92rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.login-submit-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.login-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 顶部栏 */
.header {
  padding: 1rem 1.5rem;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.header h1 {
  margin: 0;
  font-size: 1.3rem;
  color: #111827;
}

.header p {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: #4b5563;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.logout-btn {
  padding: 0.32rem 0.65rem;
  background: #fff;
  color: #4b5563;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.78rem;
  cursor: pointer;
}

.logout-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.save-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid transparent;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.save-status-badge.ready {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}
.save-status-badge.ready .status-dot {
  background: #3b82f6;
}

.save-status-badge.saving {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}
.save-status-badge.saving .status-dot {
  background: #f59e0b;
}

.save-status-badge.success {
  background: #ecfdf5;
  color: #065f46;
  border-color: #a7f3d0;
}
.save-status-badge.success .status-dot {
  background: #10b981;
}

.save-status-badge.error {
  background: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}
.save-status-badge.error .status-dot {
  background: #ef4444;
}

.url-hint {
  font-size: 0.8rem;
  color: #6b7280;
}

.url-hint code {
  background: #f3f4f6;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
}

.content-grid {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 1rem 1.5rem;
  gap: 1.25rem;
}

.panel-column {
  background: #fff;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.mapping-panel {
  width: 440px;
  flex-shrink: 0;
}

.pool-panel {
  width: 340px;
  flex-shrink: 0;
}

.panel-header {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  background: #f9fafb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.panel-header h2 {
  margin: 0;
  font-size: 1rem;
  color: #111827;
}

.panel-subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: #6b7280;
}

.save-btn {
  padding: 0.4rem 0.85rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.save-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.slot-list,
.pool-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.slot-card {
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.65rem 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.slot-card:hover {
  border-color: #93c5fd;
  background: #f8fafc;
}

.slot-card.active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.slot-card.just-updated {
  border-color: #10b981;
}

.slot-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slot-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.slot-number {
  font-weight: 800;
  font-size: 1rem;
  color: #fff;
  background: #2563eb;
  padding: 0.1rem 0.5rem;
  border-radius: 5px;
}

.slot-scene {
  font-size: 0.78rem;
  color: #4b5563;
  background: #f3f4f6;
  padding: 0.12rem 0.45rem;
  border-radius: 4px;
  font-weight: 500;
}

.slot-current-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-weight: 600;
}

.slot-select {
  width: 100%;
  padding: 0.45rem 0.6rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #111827;
  background-color: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.slot-select:hover {
  border-color: #64748b;
}

.slot-select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.slot-desc {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.76rem;
  color: #6b7280;
}

.slot-desc-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-preview-hint {
  color: #2563eb;
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

/* 资源池卡片 */
.pool-card {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  border: 1.5px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}

.pool-card:hover {
  border-color: #93c5fd;
  background: #f8fafc;
}

.pool-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.pool-letter-badge {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.pool-info {
  flex: 1;
  min-width: 0;
}

.pool-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
}

.pool-name {
  font-weight: 600;
  font-size: 0.88rem;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pool-type-tag {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  flex-shrink: 0;
}

.pool-desc {
  font-size: 0.76rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pool-used-by {
  margin-top: 0.35rem;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: #047857;
  font-weight: 600;
}

.used-slot-pill {
  background: #d1fae5;
  color: #065f46;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  font-weight: 700;
}

/* 内容类型配色 */
.type-api {
  background: #eff6ff;
  color: #1d4ed8;
}
.type-image {
  background: #fef3c7;
  color: #b45309;
}
.type-iframe {
  background: #f3e8ff;
  color: #7e22ce;
}
.type-html {
  background: #dcfce7;
  color: #15803d;
}

/* 右侧预览区 */
.preview-area {
  flex: 1;
  min-width: 300px;
  background: #fff;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.preview-header {
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  background: #f9fafb;
}

.preview-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.preview-header h2 {
  margin: 0;
  font-size: 1.05rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preview-sub-badge {
  font-size: 0.8rem;
  font-weight: 600;
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

.iframe-command {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: #4b5563;
}

.iframe-command code {
  color: #dc2626;
  background: #fef2f2;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.refresh-preview-btn {
  padding: 0.35rem 0.75rem;
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
}

.refresh-preview-btn:hover {
  background: #f3f4f6;
}

.iframe-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  background: #f8fafc;
  overflow: hidden;
}

.empty-state {
  color: #9ca3af;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
