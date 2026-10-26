import type { DataokeServerResponse, BuyUrlResult, HaodankuRatesUrlResponse } from './types';

// Dataoke服务类
export class DataokeService {
  private readonly API_URL = 'https://search.cpscpc.com/privilege-link';
  private readonly FALLBACK_API_URL = 'https://search.cpscpc.com/rates-url';

  /**
   * 获取商品购买链接
   * @param goodsId 商品ID
   * @returns Promise<BuyUrlResult> 购买链接结果
   */
  async getProductBuyUrl(goodsId: string): Promise<BuyUrlResult> {
    try {
      // 发送POST请求到服务器的特权链接接口
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          goodsId: goodsId
        })
      });

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 解析服务器返回的数据
      const data: DataokeServerResponse = await response.json();

      // 检查返回数据是否成功
      if (data.code !== 200 || data.data.code !== 0) {
        throw new Error(data.message || data.data.msg || '获取商品链接失败');
      }

      // 提取商品链接、淘口令和短链接
      const buyUrl = data.data.data.itemUrl;
      const longTpwd = data.data.data.longTpwd;
      const shortUrl = data.data.data.shortUrl;

      // 检查是否获取到有效的buyUrl
      if (!buyUrl) {
        console.log(`主API返回空白buyUrl，尝试备用API: goodsId=${goodsId}`);
        return this.tryFallbackApi(goodsId);
      }

      return {
        goodsId: goodsId,
        buyUrl: buyUrl,
        longTpwd: longTpwd,
        shortUrl: shortUrl,
        success: true,
        hasTpwd: !!longTpwd
      };
    } catch (error) {
      console.error(`主API获取商品 ${goodsId} 的购买链接失败:`, error);
      // 主API失败，尝试备用API
      return this.tryFallbackApi(goodsId);
    }
  }

  /**
   * 备用API获取商品链接（好单库淘联转链）
   * @param goodsId 商品ID
   * @returns Promise<BuyUrlResult> 购买链接结果
   */
  private async tryFallbackApi(goodsId: string): Promise<BuyUrlResult> {
    try {
      console.log(`尝试备用API获取商品链接: goodsId=${goodsId}`);

      const response = await fetch(this.FALLBACK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          params: {
            itemid: goodsId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: HaodankuRatesUrlResponse = await response.json();

      if (data.success && data.data?.item_url) {
        console.log(`备用API成功获取商品链接: ${data.data.item_url}`);
        return {
          goodsId: goodsId,
          buyUrl: data.data.item_url,
          longTpwd: '', // 备用API没有淘口令
          shortUrl: '',
          success: true,
          hasTpwd: false, // 标记没有淘口令
          itemUrl: data.data.item_url
        };
      } else {
        throw new Error(data.message || '备用API获取商品链接失败');
      }
    } catch (error) {
      console.error(`备用API获取商品 ${goodsId} 的购买链接失败:`, error);
      return {
        goodsId: goodsId,
        buyUrl: '',
        longTpwd: '',
        shortUrl: '',
        success: false,
        hasTpwd: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 批量获取商品购买链接
   * @param goodsIds 商品ID数组
   * @returns Promise<BuyUrlResult[]> 购买链接结果数组
   */
  async batchGetProductBuyUrls(goodsIds: string[]): Promise<BuyUrlResult[]> {
    // 使用Promise.all并发请求
    const promises = goodsIds.map(goodsId => this.getProductBuyUrl(goodsId));
    return Promise.all(promises);
  }
}

// 创建单例实例
export const dataokeService = new DataokeService();

