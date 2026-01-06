/**
 * 核心清理逻辑模块
 * 实现文件夹遍历、文件检查和文件移动功能
 * 支持将清理的文件移动到指定目录
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
 * 获取移动目标目录的绝对路径
 * @returns {string} - 目标目录的绝对路径
 */
const getMoveTargetDirectory = () => {
  const moveConfig = config.moveConfig || {};
  let targetDirectory = moveConfig.targetDirectory || 'trash';
  
  if (!path.isAbsolute(targetDirectory)) {
    targetDirectory = path.resolve(__dirname, targetDirectory);
  }
  
  return targetDirectory;
};

/**
 * 格式化文件大小为人类可读格式
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} - 格式化后的文件大小字符串
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  // 确保bytes大于0，避免Math.log(0)问题
  const safeBytes = Math.max(bytes, 1);
  const i = Math.min(Math.floor(Math.log(safeBytes) / Math.log(k)), sizes.length - 1);
  
  // 对于小于1KB的文件，直接显示字节数
  if (i === 0) {
    return `${bytes} B`;
  }
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

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
 * @param {string} fileName - 要检查的文件名（包含扩展名）
 * @returns {boolean} - 如果文件扩展名在允许列表中返回 true，否则返回 false
 */
const isAllowedExtension = (fileName) => {
  if (config.allowedExtensions.includes('*')) {
    return true;
  }
  
  const ext = path.extname(fileName).slice(1);
  return config.allowedExtensions.includes(ext);
};

/**
 * 检查文件是否超过保留天数
 * @param {string} filePath - 文件路径
 * @param {number} retentionDays - 保留天数
 * @returns {boolean} - 是否需要处理
 */
const isExpired = (filePath, retentionDays) => {
  try {
    const stats = fs.statSync(filePath);
    const fileTimeMs = Math.max(stats.birthtimeMs || 0, stats.mtimeMs || 0);
    const fileAgeMs = Date.now() - fileTimeMs;
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    
    if (retentionDays === 0) {
      return true;
    }
    
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
    fd = fs.openSync(filePath, 'r');
    fs.closeSync(fd);
    fd = null;
    
    fd = fs.openSync(filePath, 'r+');
    fs.closeSync(fd);
    fd = null;
    
    fd = fs.openSync(filePath, 'w', 0o666);
    fs.closeSync(fd);
    fd = null;
    
    logger.debug(`文件未被使用: ${filePath}`);
    return false;
  } catch (error) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (closeError) {
      }
    }
    
    const errorCode = error.code;
    const errorNumber = error.errno;
    
    switch (errorCode) {
      case 'EBUSY':
      case 'EAGAIN':
      case 'ETXTBSY':
      case 'EMFILE':
      case 'ENFILE':
      case 'ESHUTDOWN':
      case 'EPIPE':
        logger.warn(`文件正在使用: ${filePath}`, { error: errorCode, errno: errorNumber });
        return true;
        
      case 'EACCES':
      case 'EPERM':
      case 'ENOENT':
        logger.debug(`文件未被使用（非占用原因）: ${filePath}`, { error: errorCode, errno: errorNumber });
        return false;
        
      default:
        logger.warn(`文件访问错误: ${filePath}`, { error: errorCode, errno: errorNumber, message: error.message });
        return true;
    }
  }
};

/**
 * 确保目录存在，如果不存在则创建
 * @param {string} dirPath - 目录路径
 * @returns {boolean} - 目录是否已存在或成功创建
 */
const ensureDirectory = (dirPath) => {
  try {
    fs.ensureDirSync(dirPath);
    logger.debug(`确保目录存在: ${dirPath}`);
    return true;
  } catch (error) {
    logger.error(`创建目录失败: ${dirPath}`, { error: error.message });
    return false;
  }
};

/**
 * 获取唯一的文件名，处理文件名冲突
 * @param {string} targetDir - 目标目录
 * @param {string} fileName - 原始文件名
 * @returns {string} - 唯一的文件路径
 */
const getUniqueFileName = (targetDir, fileName) => {
  const filePath = path.join(targetDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    return filePath;
  }
  
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  let counter = 1;
  
  let uniquePath;
  do {
    uniquePath = path.join(targetDir, `${baseName}_${counter}${ext}`);
    counter++;
  } while (fs.existsSync(uniquePath));
  
  return uniquePath;
};

/**
 * 移动单个文件到目标目录，保留完整的目录结构
 * @param {string} filePath - 源文件路径
 * @param {string} targetDir - 目标目录
 * @param {string} baseDir - 基础目录路径（用于确定相对路径）
 * @returns {Object} - 移动结果 { success: boolean, targetPath: string, error?: string }
 */
const moveFile = (filePath, targetDir, baseDir) => {
  try {
    // 获取文件相对于基础目录的路径
    const relativePath = baseDir ? path.relative(baseDir, filePath) : path.basename(filePath);
    // 构建目标路径，保留完整的目录结构
    const targetPath = path.join(targetDir, relativePath);
    
    // 创建必要的子目录
    const targetFileDir = path.dirname(targetPath);
    if (!fs.existsSync(targetFileDir)) {
      fs.ensureDirSync(targetFileDir);
    }
    
    // 获取唯一的目标路径
    const uniqueTargetPath = getUniqueFileName(targetFileDir, path.basename(filePath));
    
    const stats = fs.statSync(filePath);
    const fileSize = formatFileSize(stats.size);
    
    fs.moveSync(filePath, uniqueTargetPath);
    
    logger.info(`成功移动文件: ${filePath} -> ${uniqueTargetPath}`, {
      fileName: path.basename(filePath),
      sourcePath: filePath,
      targetPath: uniqueTargetPath,
      fileSize
    });
    
    return { success: true, targetPath: uniqueTargetPath, fileName: path.basename(filePath), fileSize };
  } catch (error) {
    logger.warn(`移动文件失败: ${filePath}`, { error: error.message });
    return { success: false, targetPath: null, fileName: path.basename(filePath), error: error.message };
  }
};

/**
 * 直接删除文件
 * @param {string} filePath - 要删除的文件路径
 * @returns {Object} - 删除结果 { success: boolean, fileName: string, fileSize: string, error?: string }
 */
const deleteFile = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const fileSize = formatFileSize(stats.size);
    const fileName = path.basename(filePath);
    
    fs.removeSync(filePath);
    
    logger.info(`成功删除文件: ${filePath}`, {
      fileName,
      filePath,
      fileSize
    });
    
    return { success: true, fileName, fileSize };
  } catch (error) {
    logger.warn(`删除文件失败: ${filePath}`, { error: error.message });
    return { success: false, fileName: path.basename(filePath), fileSize: '0 B', error: error.message };
  }
};



/**
 * 清理单个文件夹
 * @param {string} folderPath - 文件夹路径
 * @param {number} retentionDays - 保留天数
 * @param {string} baseDir - 基础目录路径（用于确定相对路径，默认与folderPath相同）
 * @param {boolean} forceDelete - 是否直接删除文件（默认false，即移动到垃圾目录）
 * @returns {Object} - 清理结果统计
 */
const cleanFolder = (folderPath, retentionDays, baseDir = null, forceDelete = false) => {
  let totalFiles = 0;
  let movedFiles = 0;
  let skippedFiles = 0;
  const movedFileList = [];
  
  // 如果未提供baseDir，则使用当前folderPath作为baseDir
  const currentBaseDir = baseDir || folderPath;
  
  try {
    if (!fs.existsSync(folderPath)) {
      logger.warn(`文件夹不存在，跳过清理: ${folderPath}`);
      return { totalFiles, movedFiles, skippedFiles, movedFileList };
    }
    
    logger.info(`开始清理文件夹: ${folderPath}`, { forceDelete });
    
    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      totalFiles++;
      
      if (isProtectedFile(file)) {
        logger.info(`跳过系统保护文件: ${filePath}`);
        skippedFiles++;
        continue;
      }
      
      try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          const subFolderResult = cleanFolder(filePath, retentionDays, currentBaseDir, forceDelete);
          totalFiles += subFolderResult.totalFiles;
          movedFiles += subFolderResult.movedFiles;
          skippedFiles += subFolderResult.skippedFiles;
          movedFileList.push(...subFolderResult.movedFileList);
          continue;
        }
        
        if (!isAllowedExtension(file)) {
          logger.warn(`文件扩展名不允许处理，跳过: ${filePath}`, {
            fileName: file,
            extension: path.extname(file)
          });
          skippedFiles++;
          continue;
        }
        
        if (!isExpired(filePath, retentionDays)) {
          logger.info(`文件未过期，跳过处理: ${filePath}`);
          skippedFiles++;
          continue;
        }
        
        if (isFileInUse(filePath)) {
          logger.warn(`文件正在使用，跳过处理: ${filePath}`);
          skippedFiles++;
          continue;
        }
        
        if (forceDelete) {
          // 直接删除文件
          const deleteResult = deleteFile(filePath);
          if (deleteResult.success) {
            movedFiles++;
            movedFileList.push({
              sourcePath: filePath,
              targetPath: null,
              fileName: deleteResult.fileName,
              fileSize: deleteResult.fileSize
            });
          } else {
            skippedFiles++;
          }
        } else {
          // 移动文件到垃圾目录
          const targetDir = getMoveTargetDirectory();
          if (!ensureDirectory(targetDir)) {
            skippedFiles++;
            continue;
          }
          
          // 传递baseDir以保留完整的目录结构
          const moveResult = moveFile(filePath, targetDir, currentBaseDir);
          if (moveResult.success) {
            movedFiles++;
            movedFileList.push({
              sourcePath: filePath,
              targetPath: moveResult.targetPath,
              fileName: moveResult.fileName,
              fileSize: moveResult.fileSize
            });
          } else {
            skippedFiles++;
          }
        }
      } catch (error) {
        logger.error(`处理文件时出错: ${filePath}`, { error: error.message });
        skippedFiles++;
      }
    }
    
    logger.info(`文件夹清理完成: ${folderPath}`, {
      totalFiles,
      movedFiles,
      skippedFiles,
      forceDelete
    });
    
  } catch (error) {
    logger.error(`清理文件夹时出错: ${folderPath}`, { error: error.message });
  }
  
  return { totalFiles, movedFiles, skippedFiles, movedFileList };
};

/**
 * 执行清理任务
 * @param {Array<string>} folders - 要清理的文件夹路径数组
 * @param {number} retentionDays - 保留天数
 * @param {boolean} forceDelete - 是否直接删除文件（默认false，即移动到垃圾目录）
 * @returns {Promise<Object>} - 总清理结果统计
 */
const executeCleanup = async (folders, retentionDays, forceDelete = false) => {
  logger.info('开始执行清理任务', { retentionDays, forceDelete });
  
  
  
  if (config.allowedExtensions.includes('*')) {
    logger.warn('检测到通配符配置（"*"），将处理所有文件类型！', {
      allowedExtensions: config.allowedExtensions
    });
    
    const criticalPaths = [
      'c:\\', 'c:\\windows', 'c:\\system32', 'c:\\program files',
      'c:\\program files (x86)','c:\\programdata',
      'd:\\', 'e:\\'
    ];
    
    for (const folder of folders) {
      const folderLower = folder.toLowerCase();
      for (const criticalPath of criticalPaths) {
        if (folderLower === criticalPath || folderLower.startsWith(criticalPath + '\\')) {
          logger.error('安全检查失败：禁止在系统关键路径上执行全文件处理操作！', {
            folder: folder,
            criticalPath: criticalPath
          });
          throw new Error(`禁止在系统关键路径 ${folder} 上执行全文件处理操作`);
        }
      }
    }
    
    if (retentionDays === 0) {
      logger.warn('警告：保留天数设置为0，将处理所有符合条件的文件！', {
        retentionDays: 0
      });
    }
  }
  
  let totalTotalFiles = 0;
  let totalMovedFiles = 0;
  let totalSkippedFiles = 0;
  const allMovedFiles = [];
  
  for (const folder of folders) {
    const result = cleanFolder(folder, retentionDays, null, forceDelete);
    totalTotalFiles += result.totalFiles;
    totalMovedFiles += result.movedFiles;
    totalSkippedFiles += result.skippedFiles;
    allMovedFiles.push(...result.movedFileList);
  }
  
  logger.info('清理任务执行完成', {
    totalFiles: totalTotalFiles,
    movedFiles: totalMovedFiles,
    skippedFiles: totalSkippedFiles,
    retentionDays,
    forceDelete
  });
  
  return {
    totalFiles: totalTotalFiles,
    movedFiles: totalMovedFiles,
    skippedFiles: totalSkippedFiles,
    movedFilesList: allMovedFiles
  };
}

export { executeCleanup, isExpired };
