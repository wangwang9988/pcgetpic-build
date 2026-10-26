import { Server } from 'node:net';

// 只作用于开发进程：让选端口工具把 3001 视为不可用，继续自动找空闲端口。
// 不实际监听 3001，也不修改系统设置；server 后端和生产构建不加载此限制。
// 在创建监听之前拦截，比选好端口后检查更早，也覆盖 Nuxt 的备用端口扫描。
if (process.env.NODE_ENV === 'development') {
  const installed = Symbol.for('pcgetpic.reserved-api-port');
  if (!Server.prototype[installed]) {
    const originalListen = Server.prototype.listen;
    Server.prototype.listen = function (...args) {
      const options = args[0];
      const port = options && typeof options === 'object' ? options.port : options;
      if ((typeof port === 'number' || typeof port === 'string') && Number(port) === 3001) {
        const error = Object.assign(new Error('listen EADDRINUSE: port 3001 is reserved for server'), {
          code: 'EADDRINUSE',
          syscall: 'listen',
          port: 3001,
        });
        process.nextTick(() => this.emit('error', error));
        return this;
      }
      return Reflect.apply(originalListen, this, args);
    };
    Object.defineProperty(Server.prototype, installed, { value: true });
  }

  // Nuxt 开发子进程也会在监听前加载项目配置，从而安装同一限制。
  // 不修改 NODE_OPTIONS，避免影响从开发工具启动的编辑器等外部程序。
}
