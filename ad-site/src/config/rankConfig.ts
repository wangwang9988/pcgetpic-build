export interface RankConfig {
  id: number | string;
  name: string;
  description: string;
  apiUrl: string;
  method: 'GET' | 'POST';
  params: Record<string, any>;
  contentType?: 'api' | 'image' | 'iframe' | 'html'; // 新增：内容类型，默认为 api
  linkUrl?: string; // 新增：点击图片跳转的地址
}

/**
 * 💡 榜单配置池 (资源库)
 * 这里定义了所有可用的接口配置，每个配置都有一个唯一的字母编号 (A, B, C...)
 */
export const RANK_POOL: Record<string, Omit<RankConfig, 'id'>> = {
  'A': {
    name: '实时榜/大淘客',
    description: '实时更新的热门商品榜单',
    apiUrl: 'https://search.cpscpc.com/ranking-list',
    method: 'POST',
    params: { pageId: 1, pageSize: 50, rankType: 1 }
  },
  'B': {
    name: '全天榜/大淘客',
    description: '近24小时内表现最优秀的商品',
    apiUrl: 'https://search.cpscpc.com/ranking-list',
    method: 'POST',
    params: { pageId: 1, pageSize: 50, rankType: 2 }
  },
  'C': {
    name: '热推榜/大淘客',
    description: '平台推荐的高人气商品',
    apiUrl: 'https://search.cpscpc.com/ranking-list',
    method: 'POST',
    params: { pageId: 1, pageSize: 50, rankType: 3 }
  },
  'D': {
    name: '9.9包邮/大淘客',
    description: '物美价廉的特惠专区',
    apiUrl: 'https://search.cpscpc.com/nine-op-goods-list',
    method: 'POST',
    params: { nineCid: -1, pageId: 1, pageSize: 50 }
  },
  'E': {
    name: '高佣精选/大淘客',
    description: '每日精选好货推荐',
    apiUrl: 'https://search.cpscpc.com/high-commission-goods-list',
    method: 'POST',
    params: { pageId: "1", pageSize: 50 }
  },
  'F': {
    name: '实时佣金榜/好单库',
    description: '历史数据沉淀的高转化单品',
    apiUrl: 'https://search.cpscpc.com/haodanku/current-commission',
    method: 'POST',
    params: { cat_id: 0, min_id: 1, back: 50 }
  },
  'G': {
    name: '高佣专场/好单库',
    description: '长期表现稳定的热推商品',
    apiUrl: 'https://search.cpscpc.com/haodanku/high-items',
    method: 'POST',
    params: { cat_id: 0, min_id: 1, back: 50 }
  },
  'H': {
    name: '低价精选/好单库',
    description: '更精准的特定分类商品集',
    apiUrl: 'https://search.cpscpc.com/low-price-pinkage-data',
    method: 'GET',
    params: { type: 1, order: 1, back: 50, min_id: 1 }
  },
  'I': {
    name: '静态海报',
    description: '展示一张纯图片海报',
    apiUrl: 'https://www.yueding168.com/img/KF/sqkf.png',
    method: 'GET',
    params: {},
    contentType: 'image',
    linkUrl: 'https://www.yueding168.com/kf.html?utm_source=downpictures' // 点击图片跳转的地址
  },
  'J': {
    name: '今日值得买/好单库',
    description: '今日超值好货，实时精选',
    apiUrl: 'https://search.cpscpc.com/deserve_item',
    method: 'GET',
    params: {}
  },
  'K': {
    name: '每日低价/大淘客',
    description: '每日精准半价、限时秒杀商品',
    apiUrl: 'https://search.cpscpc.com/half-price-day',
    method: 'POST',
    params: {
      pageId: 1,
      pageSize: 50,
      sessions: '1' // 1-已开始(正在进行), 2-预告(即将开始)
    }
  },
  'L': {
    name: 'StarBook海报',
    description: '展示StarBook宣传海报',
    apiUrl: '//img.alicdn.com/imgextra/i2/1916442654/O1CN01DG8ore1VTaI9riY4H_!!1916442654.png',
    method: 'GET',
    params: {},
    contentType: 'image',
    linkUrl: 'https://starbook.ai/?utm_source=dangtu'
  },
  'M': {
    name: '客服广告',
    description: '展示客服广告图片',
    apiUrl: 'https://img.alicdn.com/imgextra/i1/1916442654/O1CN01m9kZKm1VTaIJe20XF_!!1916442654.png',
    method: 'GET',
    params: {},
    contentType: 'image',
    linkUrl: 'https://www.yueding168.com/kf.html?utm_source=downpictures'
  },
  'N': {
    name: '客服外包-上海',
    description: '展示客服外包上海页面',
    apiUrl: 'https://www.yueding168.com/shanghai-zhuaxi-ad.html?utm_source=downpictures',
    method: 'GET',
    params: {},
    contentType: 'iframe'
  },
  'O': {
    name: 'StarBook 宣传页',
    description: '展示 StarBook AI 命理解读宣传页',
    apiUrl: '/?page=starbook-promo',
    method: 'GET',
    params: {},
    contentType: 'iframe',
    linkUrl: 'https://starbook.ai/?utm_source=dangtu'
  },
  'P': {
    name: '客服外包宣传页',
    description: '展示电商专席客服外包 HTML 宣传卡片',
    apiUrl: '/?page=kefu-promo',
    method: 'GET',
    params: {},
    contentType: 'html',
    linkUrl: 'https://www.yueding168.com/kf.html?utm_source=downpictures'
  }
};

export const RANK_MAPPING: Record<number | string, string> = {
  '1': 'A',
  '2': 'P',
  '3': 'D',
  '4': 'F',
  '5': 'C',
  '6': 'F',
  '7': 'B',
  '8': 'H',
  'eA': 'A',
  'eB': 'B',
  'eC': 'C',
  'eD': 'D',
  'eE': 'E',
  'eF': 'F',
  'eG': 'G',
  'eH': 'H',
  'eI': 'I',
  'eJ': 'J',
  'eK': 'K',
  'eL': 'L',
  'eM': 'M',
  'eN': 'N',
  'eO': 'O',
  'eP': 'P',
};

// 导出最终生成的配置对象，保持原有引用不变
export const RANK_LIST_CONFIG: Record<number | string, RankConfig> = {};

// 动态填充配置
for (const key in RANK_MAPPING) {
  const poolKey = RANK_MAPPING[key];
  if (poolKey && RANK_POOL[poolKey]) {
    RANK_LIST_CONFIG[key] = {
      id: key,
      ...RANK_POOL[poolKey]
    } as RankConfig;
  }
}
