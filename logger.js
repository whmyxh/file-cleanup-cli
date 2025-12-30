/**
 * 日志配置模块
 * 使用winston库实现日志记录
 */

import winston from 'winston';
import { format } from 'winston';
import path from 'path';
import fs from 'fs';
import config from './config.js';

// 确保日志目录存在
const logDir = path.dirname(config.logConfig.filePath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 定义日志格式
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// 创建日志实例
const logger = winston.createLogger({
  level: config.logConfig.level,
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        logFormat
      )
    }),
    // 文件输出
    new winston.transports.File({
      filename: config.logConfig.filePath,
      maxsize: config.logConfig.maxSize * 1024 * 1024, // 转换为字节
      maxFiles: config.logConfig.maxFiles,
      tailable: true,
      zippedArchive: true
    })
  ]
});

export default logger;
