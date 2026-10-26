// Dataoke商品数据接口
export interface DataokeProduct {
  id: string;
  goodsId: string;
  title: string;
  dtitle: string;
  originalPrice: number;
  actualPrice: number;
  shopType: number;
  monthSales: number;
  dailySales: number;
  twoHoursSales: number;
  desc: string;
  shopName: string;
  shopLevel: number;
  descScore: number;
  dsrScore: number;
  shipScore: number;
  serviceScore: number;
  mainPic: string;
  discounts: number;
  // 优惠券信息
  couponPrice?: number;
  couponConditions?: string;
  couponRemainCount?: number;
  // 品牌信息
  brandName?: string;
  // 活动信息
  activityInfo?: Array<{
    activityId: number;
    activityName: string;
  }>;
  // 特殊标签
  specialText?: string[];
}

// 服务器返回数据接口
export interface DataokeServerResponse {
  code: number;
  message: string;
  success: boolean;
  data: {
    cache: boolean;
    code: number;
    data: {
      couponClickUrl: string;
      couponEndTime: string;
      couponInfo: string;
      couponStartTime: string;
      itemId: string;
      couponTotalCount: string;
      couponRemainCount: string;
      itemUrl: string;
      tpwd: string;
      longTpwd: string;
      maxCommissionRate: string;
      shortUrl: string;
      minCommissionRate: string;
      kuaiZhanUrl: string;
      originalPrice: number;
      actualPrice: number;
      title: string;
    };
    msg: string;
    requestId: string;
    time: number;
  };
}

// 购买链接结果接口
export interface BuyUrlResult {
  goodsId: string;
  buyUrl: string;
  longTpwd: string;
  shortUrl: string; // 新增短链接用于二维码
  success: boolean;
  error?: string;
  hasTpwd: boolean; // 是否有淘口令（备用API没有淘口令）
  itemUrl?: string; // 好单库返回的item_url
}

// 好单库rates-url接口返回数据
export interface HaodankuRatesUrlResponse {
  success: boolean;
  message?: string;
  data?: {
    item_url?: string;
    item_id?: string;
    coupon_click_url?: string;
    // 其他字段...
  };
}
