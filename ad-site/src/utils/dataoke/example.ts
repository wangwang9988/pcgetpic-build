// Dataoke模块使用示例
import { dataokeService } from './index';

// 示例1：获取单个商品购买链接
async function exampleSingleProduct() {
  console.log('示例1：获取单个商品购买链接');

  const goodsId = '1234567890';

  try {
    const result = await dataokeService.getProductBuyUrl(goodsId);

    if (result.success) {
      console.log(`商品 ${goodsId} 的购买链接获取成功：`);
      console.log(`链接：${result.buyUrl}`);
      // 这里可以更新UI，将"查看详情"按钮切换为"立即购买"按钮
      // 例如：updateButton(result.goodsId, result.buyUrl);
    } else {
      console.error(`商品 ${goodsId} 的购买链接获取失败：${result.error}`);
    }
  } catch (error) {
    console.error('发生错误：', error);
  }
}

// 示例2：批量获取商品购买链接
async function exampleBatchProducts() {
  console.log('\n示例2：批量获取商品购买链接');

  const goodsIds = ['1234567890', '0987654321', '1122334455'];

  try {
    const results = await dataokeService.batchGetProductBuyUrls(goodsIds);

    results.forEach(result => {
      if (result.success) {
        console.log(`商品 ${result.goodsId} 的购买链接获取成功：${result.buyUrl}`);
      } else {
        console.error(`商品 ${result.goodsId} 的购买链接获取失败：${result.error}`);
      }
    });
  } catch (error) {
    console.error('发生错误：', error);
  }
}

// 示例3：在Vue组件中使用
function exampleInVueComponent() {
  console.log('\n示例3：在Vue组件中使用');

  /*
  // 在Vue组件中使用的示例代码
  import { ref } from 'vue';
  import { dataokeService } from './dataoke';
  
  const buyUrls = ref<Record<string, string>>({});
  const loadingStatus = ref<Record<string, boolean>>({});
  
  async function handleProductClick(goodsId: string) {
    // 更新加载状态
    loadingStatus.value[goodsId] = true;
    
    try {
      const result = await dataokeService.getProductBuyUrl(goodsId);
      
      if (result.success) {
        // 更新商品购买链接
        buyUrls.value[goodsId] = result.buyUrl;
      }
    } finally {
      // 更新加载状态
      loadingStatus.value[goodsId] = false;
    }
  }
  */

  console.log('在Vue组件中使用Dataoke模块的示例代码已展示');
}

// 运行示例
async function runExamples() {
  console.log('Dataoke模块使用示例');
  console.log('====================');

  await exampleSingleProduct();
  await exampleBatchProducts();
  exampleInVueComponent();

  console.log('\n所有示例运行完毕');
}

// 导出示例函数，方便在其他地方调用
export { runExamples, exampleSingleProduct, exampleBatchProducts, exampleInVueComponent };
