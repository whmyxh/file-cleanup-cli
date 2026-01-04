/**
 * 核心清理逻辑模块
 * 实现文件夹遍历、文件检查和安全删除功能
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import logger from './logger.js';

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
    logger.error(`加载配置文件失败: ${e.message}`);
    throw e;
  }
};

const config = loadConfig();

/**
 * 检查文件是否为系统保护文件
 * @param {string} fileName - 文件名
 * @returns {boolean} - 是否为保护文件
 */
const isProtectedFile = (fileName) => {
  const lowerFileName = fileName.toLowerCase();
  return config.protectedFiles.some(protectedFile => 
    lowerFileName === protectedFile.toLowerCase()
  );
};

/**
 * 检查文件扩展名是否在允许删除的列表中
 * 该函数用于在清理过程中筛选可以删除的文件类型
 * 
 * @param {string} fileName - 要检查的文件名（包含扩展名）
 * @returns {boolean} - 如果文件扩展名在允许列表中返回 true，否则返回 false
 */
const isAllowedExtension = (fileName) => {
  // 检查是否配置了"*"作为通配符（代表所有文件类型）
  if (config.allowedExtensions.includes('*')) {
    return true;
  }
  
  // 获取文件扩展名（不含点号），例如：'test.txt' -> 'txt'
  const ext = path.extname(fileName).slice(1);
  // 检查扩展名是否在配置文件中定义的允许删除列表内
  return config.allowedExtensions.includes(ext);
};

/**
 * 检查文件是否超过保留天数
 * @param {string} filePath - 文件路径
 * @param {number} retentionDays - 保留天数
 * @returns {boolean} - 是否需要删除
 */
const isExpired = (filePath, retentionDays) => {
  try {
    const stats = fs.statSync(filePath);
    // 同时检查创建时间和修改时间，使用最新的时间来计算文件年龄
    const fileTimeMs = Math.max(stats.birthtimeMs || 0, stats.mtimeMs || 0);
    const fileAgeMs = Date.now() - fileTimeMs;
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    
    // 如果保留天数为0，则所有文件都过期
    if (retentionDays === 0) {
      return true;
    }
    
    // 否则检查文件年龄是否超过保留天数
    return fileAgeMs > retentionMs;
  } catch (error) {
    logger.warn(`获取文件状态失败: ${filePath}`, { error: error.message });
    return false;
  }
};

/**
 * 检查文件是否正在使用
 * @param {string} filePath - 文件路径
 * @returns {boolean} - 是否正在使用
 */
const isFileInUse = (filePath) => {
  let fd = null;
  
  try {
    // 尝试以只读模式打开文件，检查文件是否存在和基本访问权限
    fd = fs.openSync(filePath, 'r');
    fs.closeSync(fd);
    fd = null;
    
    // 尝试以写入模式打开文件，检查文件是否正在被其他进程占用
    fd = fs.openSync(filePath, 'r+');
    fs.closeSync(fd);
    fd = null;
    
    // 尝试以独占锁模式打开文件，检查文件是否被锁定
    fd = fs.openSync(filePath, 'w', 0o666);
    fs.closeSync(fd);
    fd = null;
    
    // 所有尝试都成功，文件未被使用
    logger.debug(`文件未被使用: ${filePath}`);
    return false;
  } catch (error) {
    // 确保文件描述符被正确关闭
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (closeError) {
        // 忽略关闭错误
      }
    }
    
    // 区分不同类型的错误
    const errorCode = error.code;
    const errorNumber = error.errno;
    
    // 根据错误类型判断文件是否正在使用
    // 参考: https://nodejs.org/api/errors.html#system-errors
    switch (errorCode) {
      case 'EBUSY': // 设备或资源忙
      case 'EAGAIN': // 资源暂时不可用
      case 'ETXTBSY': // 文本文件忙
      case 'EMFILE': // 打开的文件过多
      case 'ENFILE': // 系统打开的文件过多
      case 'ESHUTDOWN': // 传输端点已经关闭
      case 'EPIPE': // 管道破裂
        logger.warn(`文件正在使用: ${filePath}`, { error: errorCode, errno: errorNumber });
        return true;
        
      case 'EACCES': // 权限错误
      case 'EPERM': // 操作不允许
      case 'ENOENT': // 文件不存在
        logger.debug(`文件未被使用（非占用原因）: ${filePath}`, { error: errorCode, errno: errorNumber });
        return false;
        
      default:
        // 其他错误，记录详细信息以便分析
        logger.warn(`文件访问错误: ${filePath}`, { error: errorCode, errno: errorNumber, message: error.message });
        // 对于未知错误，保守处理，假设文件正在使用
        return true;
    }
  }
};

/**
 * 删除单个文件
 * @param {string} filePath - 文件路径
 * @returns {boolean} - 删除是否成功
 */
const deleteFile = (filePath) => {
  try {
    fs.unlinkSync(filePath);
    logger.info(`成功删除文件: ${filePath}`);
    return true;
  } catch (error) {
    logger.warn(`删除文件失败: ${filePath}`, { error: error.message });
    return false;
  }
};

/**
 * 清理单个文件夹
 * @param {string} folderPath - 文件夹路径
 * @param {number} retentionDays - 保留天数
 * @returns {Object} - 清理结果统计
 */
const cleanFolder = (folderPath, retentionDays) => {
  let totalFiles = 0;
  let deletedFiles = 0;
  let skippedFiles = 0;
  
  try {
    // 检查文件夹是否存在
    if (!fs.existsSync(folderPath)) {
      logger.warn(`文件夹不存在，跳过清理: ${folderPath}`);
      return { totalFiles, deletedFiles, skippedFiles };
    }
    
    logger.info(`开始清理文件夹: ${folderPath}`);
    
    // 遍历文件夹内的所有文件
    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      totalFiles++;
      
      // 检查是否为系统保护文件
      if (isProtectedFile(file)) {
        logger.info(`跳过系统保护文件: ${filePath}`);
        skippedFiles++;
        continue;
      }
      
      try {
        // 先检查是否为文件夹
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          // 递归清理子文件夹，传递相同的保留天数
          const subFolderResult = cleanFolder(filePath, retentionDays);
          totalFiles += subFolderResult.totalFiles;
          deletedFiles += subFolderResult.deletedFiles;
          skippedFiles += subFolderResult.skippedFiles;
          continue;
        }
        
        // 检查文件扩展名是否允许删除（仅对文件执行此检查）
        if (!isAllowedExtension(file)) {
          logger.warn(`文件扩展名不允许删除，跳过删除: ${filePath}`, {
            fileName: file,
            extension: path.extname(file)
          });
          skippedFiles++;
          continue;
        }
        
        // 检查文件是否超过保留天数
        if (!isExpired(filePath, retentionDays)) {
          logger.info(`文件未过期，跳过删除: ${filePath}`);
          skippedFiles++;
          continue;
        }
        
        // 检查文件是否正在使用
        if (isFileInUse(filePath)) {
          logger.warn(`文件正在使用，跳过删除: ${filePath}`);
          skippedFiles++;
          continue;
        }
        
        // 尝试删除文件
        if (deleteFile(filePath)) {
          deletedFiles++;
        } else {
          skippedFiles++;
        }
      } catch (error) {
        logger.error(`处理文件时出错: ${filePath}`, { error: error.message });
        skippedFiles++;
      }
    }
    
    logger.info(`文件夹清理完成: ${folderPath}`, {
      totalFiles,
      deletedFiles,
      skippedFiles
    });
    
  } catch (error) {
    logger.error(`清理文件夹时出错: ${folderPath}`, { error: error.message });
  }
  
  return { totalFiles, deletedFiles, skippedFiles };
};

/**
 * 执行清理任务
 * @param {Array<string>} folders - 要清理的文件夹路径数组
 * @param {number} retentionDays - 保留天数
 * @returns {Object} - 总清理结果统计
 */
const executeCleanup = (folders, retentionDays) => {
  logger.info('开始执行清理任务', { retentionDays });
  
  // 安全检查：当配置为删除所有文件（"*"）时的额外验证
  if (config.allowedExtensions.includes('*')) {
    logger.warn('检测到通配符配置（"*"），将删除所有文件类型！', {
      allowedExtensions: config.allowedExtensions
    });
    
    // 安全检查1：确保清理路径不是系统关键路径
    const criticalPaths = [
      'c:\\', 'c:\\windows', 'c:\\system32', 'c:\\program files',
      'c:\\program files (x86)', 'c:\\users', 'c:\\programdata',
      'd:\\', 'e:\\' // 根目录也需要特别注意
    ];
    
    for (const folder of folders) {
      const folderLower = folder.toLowerCase();
      for (const criticalPath of criticalPaths) {
        if (folderLower === criticalPath || folderLower.startsWith(criticalPath + '\\')) {
          logger.error('安全检查失败：禁止在系统关键路径上执行全文件删除操作！', {
            folder: folder,
            criticalPath: criticalPath
          });
          throw new Error(`禁止在系统关键路径 ${folder} 上执行全文件删除操作`);
        }
      }
    }
    
    // 安全检查2：确保保留天数不为0，避免立即删除所有文件
    if (retentionDays === 0) {
      logger.warn('警告：保留天数设置为0，将删除所有符合条件的文件！', {
        retentionDays: 0
      });
    }
  }
  
  let totalTotalFiles = 0;
  let totalDeletedFiles = 0;
  let totalSkippedFiles = 0;
  
  // 遍历所有目标文件夹
  for (const folder of folders) {
    const result = cleanFolder(folder, retentionDays);
    totalTotalFiles += result.totalFiles;
    totalDeletedFiles += result.deletedFiles;
    totalSkippedFiles += result.skippedFiles;
  }
  
  logger.info('清理任务执行完成', {
    totalFiles: totalTotalFiles,
    deletedFiles: totalDeletedFiles,
    skippedFiles: totalSkippedFiles,
    retentionDays
  });
  
  return {
    totalFiles: totalTotalFiles,
    deletedFiles: totalDeletedFiles,
    skippedFiles: totalSkippedFiles
  };
};

export { executeCleanup, isExpired };
