/**
 * 日志配置模块
 * 使用winston库实现日志记录
 */

import winston from 'winston';
import { format } from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

/**
 * 获取当前模块的目录路径
 * @returns {string} - 当前模块的目录路径
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 加载YAML配置文件
 * @returns {Object} - 配置对象
 */
const loadConfig = () => {
  try {
    const configPath = path.join(__dirname, 'config.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const data = yaml.load(fileContents);
    return data;
  } catch (e) {
    console.error(`加载配置文件失败: ${e.message}`);
    throw e;
  }
};

const config = loadConfig();

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
