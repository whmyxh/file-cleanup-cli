/**
 * 配置管理模块
 * 处理目标文件夹路径的增删改操作
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

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'config.yaml');

/**
 * 验证文件夹路径是否有效
 * @param {string} folderPath - 文件夹路径（可以是相对路径或绝对路径）
 * @returns {Object} - 验证结果 { valid: boolean, error: string, absolutePath: string }
 */
const validateFolderPath = (folderPath) => {
  try {
    // 检查路径是否为空
    if (!folderPath || folderPath.trim() === '') {
      return { valid: false, error: '文件夹路径不能为空', absolutePath: null };
    }

    // 将相对路径转换为绝对路径
    const absolutePath = path.isAbsolute(folderPath) ? folderPath : path.join(process.cwd(), folderPath);

    // 检查文件夹是否存在
    if (!fs.existsSync(absolutePath)) {
      return { valid: false, error: '文件夹不存在', absolutePath };
    }

    // 检查路径是否为文件夹
    const stats = fs.statSync(absolutePath);
    if (!stats.isDirectory()) {
      return { valid: false, error: '路径不是一个文件夹', absolutePath };
    }

    // 检查是否有读取权限
    try {
      fs.accessSync(absolutePath, fs.constants.R_OK);
    } catch (error) {
      return { valid: false, error: '没有读取文件夹的权限', absolutePath };
    }

    // 检查是否有写入权限（用于删除文件）
    try {
      fs.accessSync(absolutePath, fs.constants.W_OK);
    } catch (error) {
      return { valid: false, error: '没有写入文件夹的权限', absolutePath };
    }

    return { valid: true, error: null, absolutePath };
  } catch (error) {
    return { valid: false, error: `验证失败: ${error.message}`, absolutePath: null };
  }
};

/**
 * 加载配置文件
 * @returns {Array} - 文件夹路径列表
 */
const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = yaml.load(data);
      logger.info(`成功加载配置文件: ${CONFIG_FILE}`, { folders: config.folders });
      return config.folders || [];
    } else {
      logger.info(`配置文件不存在，返回空列表: ${CONFIG_FILE}`);
      return [];
    }
  } catch (error) {
    logger.error(`加载配置文件失败: ${CONFIG_FILE}`, { error: error.message });
    return [];
  }
};

/**
 * 保存配置文件
 * @param {Array} folders - 文件夹路径列表
 * @returns {boolean} - 保存是否成功
 */
const saveConfig = (folders) => {
  try {
    // 读取现有配置值
    let config = {
      retentionDays: 7,
      allowedExtensions: ['docx', 'xlsx', 'csv', 'pptx', 'txt'],
      protectedFiles: ['desktop.ini', 'thumbs.db', '$recycle.bin', 'system volume information'],
      logConfig: {
        level: 'info',
        filePath: 'logs/cleanup.log',
        maxSize: 10,
        maxFiles: 5
      }
    };
    
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const loadedConfig = yaml.load(data) || {};
      // 合并现有配置值
      config = {
        retentionDays: loadedConfig.retentionDays || config.retentionDays,
        allowedExtensions: loadedConfig.allowedExtensions || config.allowedExtensions,
        protectedFiles: loadedConfig.protectedFiles || config.protectedFiles,
        logConfig: loadedConfig.logConfig || config.logConfig
      };
    }
    
    // 更新folders字段
    config.folders = folders;
    
    // 创建带注释的YAML内容
    const yamlContent = `# 清理脚本配置文件
# 定义清理规则和保留策略

# 默认文件保留天数（单位：天）
retentionDays: ${config.retentionDays}

# 允许删除的文件扩展名列表（区分大小写）
allowedExtensions:
${config.allowedExtensions.map(ext => `  - ${ext}`).join('\n')}

# 系统保护文件列表（文件名，不区分大小写）
protectedFiles:
${config.protectedFiles.map(file => `  - ${file}`).join('\n')}

# 日志配置
logConfig:
  # 日志级别：error, warn, info, verbose, debug, silly
  level: ${config.logConfig.level}
  # 日志文件路径
  filePath: ${config.logConfig.filePath}
  # 日志文件最大大小（单位：MB）
  maxSize: ${config.logConfig.maxSize}
  # 日志文件最大数量
  maxFiles: ${config.logConfig.maxFiles}

# 要清理的文件夹列表（绝对路径）
folders:
${config.folders.map(folder => `  - "${folder.replace(/\\/g, '\\\\')}"`).join('\n')}
`;
    
    // 保存配置到YAML文件
    fs.writeFileSync(CONFIG_FILE, yamlContent, 'utf8');
    
    logger.info(`成功保存配置文件: ${CONFIG_FILE}`, { folders });
    return true;
  } catch (error) {
    logger.error(`保存配置文件失败: ${CONFIG_FILE}`, { error: error.message });
    return false;
  }
};

/**
 * 添加文件夹路径
 * @param {string} folderPath - 文件夹路径（可以是相对路径或绝对路径）
 * @returns {Object} - 操作结果 { success: boolean, message: string }
 */
const addFolder = (folderPath) => {
  const folders = loadConfig();
  
  // 验证文件夹路径
  const validation = validateFolderPath(folderPath);
  if (!validation.valid) {
    logger.warn(`添加文件夹失败: ${folderPath}`, { error: validation.error });
    return { success: false, message: validation.error };
  }
  
  // 使用绝对路径
  const absolutePath = validation.absolutePath;
  
  // 检查是否已存在
  if (folders.includes(absolutePath)) {
    logger.warn(`文件夹已存在: ${absolutePath}`);
    return { success: false, message: '文件夹已存在于配置中' };
  }
  
  // 添加文件夹
  folders.push(absolutePath);
  
  // 保存配置
  if (saveConfig(folders)) {
    logger.info(`成功添加文件夹: ${absolutePath}`);
    return { success: true, message: '文件夹添加成功' };
  } else {
    return { success: false, message: '保存配置失败' };
  }
};

/**
 * 删除文件夹路径
 * @param {string} folderPath - 文件夹路径（可以是相对路径或绝对路径）
 * @returns {Object} - 操作结果 { success: boolean, message: string }
 */
const removeFolder = (folderPath) => {
  const folders = loadConfig();
  
  // 将相对路径转换为绝对路径
  const absolutePath = path.isAbsolute(folderPath) ? folderPath : path.join(process.cwd(), folderPath);
  
  // 检查是否存在
  const index = folders.indexOf(absolutePath);
  if (index === -1) {
    logger.warn(`文件夹不存在: ${absolutePath}`);
    return { success: false, message: '文件夹不存在于配置中' };
  }
  
  // 删除文件夹
  folders.splice(index, 1);
  
  // 保存配置
  if (saveConfig(folders)) {
    logger.info(`成功删除文件夹: ${absolutePath}`);
    return { success: true, message: '文件夹删除成功' };
  } else {
    return { success: false, message: '保存配置失败' };
  }
};

/**
 * 修改文件夹路径
 * @param {string} oldPath - 旧文件夹路径（可以是相对路径或绝对路径）
 * @param {string} newPath - 新文件夹路径（可以是相对路径或绝对路径）
 * @returns {Object} - 操作结果 { success: boolean, message: string }
 */
const updateFolder = (oldPath, newPath) => {
  const folders = loadConfig();
  
  // 将旧路径转换为绝对路径
  const oldAbsolutePath = path.isAbsolute(oldPath) ? oldPath : path.join(process.cwd(), oldPath);
  
  // 检查旧路径是否存在
  const index = folders.indexOf(oldAbsolutePath);
  if (index === -1) {
    logger.warn(`要修改的文件夹不存在: ${oldAbsolutePath}`);
    return { success: false, message: '要修改的文件夹不存在于配置中' };
  }
  
  // 验证新路径
  const validation = validateFolderPath(newPath);
  if (!validation.valid) {
    logger.warn(`修改文件夹失败: ${newPath}`, { error: validation.error });
    return { success: false, message: validation.error };
  }
  
  // 使用新路径的绝对路径
  const newAbsolutePath = validation.absolutePath;
  
  // 检查新路径是否已存在（排除自身）
  if (folders.includes(newAbsolutePath) && newAbsolutePath !== oldAbsolutePath) {
    logger.warn(`新文件夹路径已存在: ${newAbsolutePath}`);
    return { success: false, message: '新文件夹路径已存在于配置中' };
  }
  
  // 修改文件夹
  folders[index] = newAbsolutePath;
  
  // 保存配置
  if (saveConfig(folders)) {
    logger.info(`成功修改文件夹: ${oldAbsolutePath} -> ${newAbsolutePath}`);
    return { success: true, message: '文件夹修改成功' };
  } else {
    return { success: false, message: '保存配置失败' };
  }
};

/**
 * 获取所有文件夹路径
 * @returns {Array} - 文件夹路径列表
 */
const getAllFolders = () => {
  const folders = loadConfig();
  logger.info(`获取所有文件夹配置`, { count: folders.length });
  return folders;
};

/**
 * 清空所有文件夹配置
 * @returns {Object} - 操作结果 { success: boolean, message: string }
 */
const clearAllFolders = () => {
  if (saveConfig([])) {
    logger.info(`成功清空所有文件夹配置`);
    return { success: true, message: '文件夹配置已清空' };
  } else {
    return { success: false, message: '保存配置失败' };
  }
};

export {
  addFolder,
  removeFolder,
  updateFolder,
  getAllFolders,
  clearAllFolders,
  validateFolderPath,
  loadConfig
};
