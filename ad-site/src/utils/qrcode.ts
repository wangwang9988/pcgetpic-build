import QRCode from 'qrcode';

/**
 * 二维码生成器类
 * 按照用户技术方案实现
 */
export class QRCodeGenerator {
    /**
     * 生成二维码 DataURL（最常用）
     * @param text 文本内容
     * @param size 尺寸，默认 800
     * @returns Promise<string> Base64 DataURL
     */
    async generateDataUrl(text: string, size: number = 800): Promise<string> {
        return await QRCode.toDataURL(text, {
            width: size,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' },
        });
    }

    /**
     * 生成二维码 Canvas（用于复制到剪贴板）
     * @param text 文本内容
     * @param size 尺寸，默认 800
     * @returns Promise<HTMLCanvasElement>
     */
    async generateQRCode(text: string, size: number = 800): Promise<HTMLCanvasElement> {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, text, { width: size, margin: 2 });
        return canvas;
    }

    /**
     * 复制二维码图片到剪贴板
     * @param canvas Canvas 元素
     * @returns Promise<void>
     */
    async copyToClipboard(canvas: HTMLCanvasElement): Promise<void> {
        return new Promise((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                if (!blob) return reject(new Error('Failed to create blob'));
                try {
                    const item = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([item]);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            }, 'image/png');
        });
    }
}

// 单例实例
export const qrCodeGenerator = new QRCodeGenerator();

/**
 * 便捷函数：生成二维码 DataURL
 * @param text 文本内容
 * @param size 尺寸，默认 800
 */
export async function generateQRCodeDataUrl(text: string, size = 800): Promise<string> {
    return await qrCodeGenerator.generateDataUrl(text, size);
}

/**
 * 便捷函数：复制分享文本到剪贴板
 * @param title 商品标题
 * @param shortUrl 短链接
 */
export async function copyShareText(title: string, shortUrl: string): Promise<void> {
    await navigator.clipboard.writeText(`${title}：${shortUrl}`);
}

/**
 * 便捷函数：生成并复制二维码图片
 * @param text 文本内容
 * @param size 尺寸，默认 800
 */
export async function generateAndCopyQRCode(text: string, size = 800): Promise<string> {
    const canvas = await qrCodeGenerator.generateQRCode(text, size);
    await qrCodeGenerator.copyToClipboard(canvas);
    return canvas.toDataURL('image/png');
}
