# 部署前核对：Nginx 实际运行用户/组、PID 路径，以及宝塔是否已启用同站点日志切割。
# 宝塔切割与本规则二选一，避免重复轮转。
/www/wwwlogs/addp.yueding168.com.log {
    daily
    maxsize 200M
    rotate 7
    missingok
    notifempty
    compress
    delaycompress
    dateext
    create 0640 www www
    sharedscripts
    postrotate
        if [ -s /www/server/nginx/logs/nginx.pid ]; then
            kill -USR1 "$(cat /www/server/nginx/logs/nginx.pid)"
        elif [ -s /var/run/nginx.pid ]; then
            kill -USR1 "$(cat /var/run/nginx.pid)"
        fi
    endscript
}

# 若单日仍超过 500MB，请让系统每小时调用 logrotate；maxsize 只有在规则被执行时才会检查。
