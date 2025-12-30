/**
 * 核心清理逻辑模块
 * 实现文件夹遍历、文件检查和安全删除功能
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import logger from './logger.js';

/**
 * 加载YAML配置文件
 * @returns {Object} - 配置对象
 */
const loadConfig = () => {
  try {
    const fileContents = fs.readFileSync('./config.yaml', 'utf8');
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
 * 检查文件扩展名是否允许删除
 * @param {string} fileName - 文件名
 * @returns {boolean} - 是否允许删除
 */
const isAllowedExtension = (fileName) => {
  const ext = path.extname(fileName).slice(1);
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
    const fileAgeMs = Date.now() - stats.birthtimeMs;
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
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
  try {
    // 尝试以写入模式打开文件，如果失败则表示文件正在使用
    const fd = fs.openSync(filePath, 'r+');
    fs.closeSync(fd);
    return false;
  } catch (error) {
    // 权限错误或文件正在使用时都会返回true
    return true;
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
 * @returns {Object} - 清理结果统计
 */
const cleanFolder = (folderPath) => {
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
      
      // 检查文件扩展名是否允许删除
      if (!isAllowedExtension(file)) {
        logger.warn(`文件扩展名不允许删除，跳过删除: ${filePath}`, {
          fileName: file,
          extension: path.extname(file)
        });
        skippedFiles++;
        continue;
      }
      
      try {
        // 检查是否为文件夹
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          // 递归清理子文件夹
          const subFolderResult = cleanFolder(filePath);
          totalFiles += subFolderResult.totalFiles;
          deletedFiles += subFolderResult.deletedFiles;
          skippedFiles += subFolderResult.skippedFiles;
          continue;
        }
        
        // 检查文件是否超过保留天数
        if (!isExpired(filePath, config.retentionDays)) {
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
 * @returns {Object} - 总清理结果统计
 */
const executeCleanup = (folders) => {
  logger.info('开始执行清理任务');
  
  let totalTotalFiles = 0;
  let totalDeletedFiles = 0;
  let totalSkippedFiles = 0;
  
  // 遍历所有目标文件夹
  for (const folder of folders) {
    const result = cleanFolder(folder);
    totalTotalFiles += result.totalFiles;
    totalDeletedFiles += result.deletedFiles;
    totalSkippedFiles += result.skippedFiles;
  }
  
  logger.info('清理任务执行完成', {
    totalFiles: totalTotalFiles,
    deletedFiles: totalDeletedFiles,
    skippedFiles: totalSkippedFiles
  });
  
  return {
    totalFiles: totalTotalFiles,
    deletedFiles: totalDeletedFiles,
    skippedFiles: totalSkippedFiles
  };
};

export { executeCleanup };
