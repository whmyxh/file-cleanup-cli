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

    // 清理路径字符串，移除首尾空白字符
    const trimmedPath = folderPath.trim();

    // 检查路径中是否包含无效字符
    // 对于 Windows 绝对路径（如 C:\folder），冒号是合法的
    // 对于其他情况，冒号应该被视为无效字符
    const invalidChars = /[<>:"|?*]/;
    let hasInvalidChars = false;
    
    if (invalidChars.test(trimmedPath)) {
      // 检查是否是 Windows 绝对路径格式（如 C:\folder 或 C:/folder）
      const windowsAbsolutePathRegex = /^[a-zA-Z]:[\\/]/;
      if (windowsAbsolutePathRegex.test(trimmedPath)) {
        // 对于 Windows 绝对路径，只检查除了驱动器号后的冒号之外的其他无效字符
        const pathWithoutDrive = trimmedPath.substring(2);
        hasInvalidChars = /[<>:"|?*]/ .test(pathWithoutDrive);
      } else {
        hasInvalidChars = true;
      }
    }
    
    if (hasInvalidChars) {
      return { valid: false, error: '路径包含无效字符（<>:"|?*）', absolutePath: null };
    }

    // 检查路径是否为绝对路径
    let absolutePath;
    try {
      // 尝试解析为绝对路径
      absolutePath = path.isAbsolute(trimmedPath) 
        ? path.resolve(trimmedPath) 
        : path.resolve(process.cwd(), trimmedPath);
    } catch (error) {
      return { valid: false, error: '路径格式无效', absolutePath: null };
    }

    // 检查文件夹是否存在
    if (!fs.existsSync(absolutePath)) {
      return { valid: false, error: '文件夹不存在', absolutePath };
    }

    // 检查路径是否为文件夹
    try {
      const stats = fs.statSync(absolutePath);
      if (!stats.isDirectory()) {
        return { valid: false, error: '路径不是一个文件夹', absolutePath };
      }
    } catch (error) {
      return { valid: false, error: '无法获取路径信息', absolutePath };
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
 * 加载完整配置文件
 * @returns {Object} - 完整配置对象
 */
const loadFullConfig = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = yaml.load(data);
      logger.info(`成功加载配置文件: ${CONFIG_FILE}`);
      return config || {};
    } else {
      logger.info(`配置文件不存在，返回空对象: ${CONFIG_FILE}`);
      return {};
    }
  } catch (error) {
    logger.error(`加载配置文件失败: ${CONFIG_FILE}`, { error: error.message });
    return {};
  }
};

/**
 * 加载配置文件中的文件夹列表
 * @returns {Array} - 文件夹路径列表
 */
const loadConfig = () => {
  try {
    const config = loadFullConfig();
    logger.info(`成功加载配置文件: ${CONFIG_FILE}`, { folders: config.folders });
    return config.folders || [];
  } catch (error) {
    logger.error(`加载配置文件失败: ${CONFIG_FILE}`, { error: error.message });
    return [];
  }
};

/**
 * 获取回收站目录设置
 * @returns {string} - 回收站目录路径
 */
const getRecycleBinDir = () => {
  try {
    const config = loadFullConfig();
    const targetDir = config.moveConfig?.targetDirectory || 'trash';
    logger.info(`获取回收站目录设置: ${targetDir}`);
    return targetDir;
  } catch (error) {
    logger.error(`获取回收站目录设置失败`, { error: error.message });
    return 'trash';
  }
};

/**
 * 验证回收站目录路径
 * @param {string} dirPath - 目录路径（可以是相对路径或绝对路径）
 * @returns {Object} - 验证结果 { valid: boolean, error: string, path: string }
 */
const validateRecycleBinPath = (dirPath) => {
  try {
    // 检查路径是否为空
    if (!dirPath || dirPath.trim() === '') {
      return { valid: false, error: '目录路径不能为空', path: null };
    }

    // 清理路径字符串，移除首尾空白字符
    const trimmedPath = dirPath.trim();

    // 检查路径中是否包含无效字符
    // 对于 Windows 绝对路径（如 C:\folder），冒号是合法的
    // 对于其他情况，冒号应该被视为无效字符
    const invalidChars = /[<>:"|?*]/;
    let hasInvalidChars = false;
    
    if (invalidChars.test(trimmedPath)) {
      // 检查是否是 Windows 绝对路径格式（如 C:\folder 或 C:/folder）
      const windowsAbsolutePathRegex = /^[a-zA-Z]:[\\/]/;
      if (windowsAbsolutePathRegex.test(trimmedPath)) {
        // 对于 Windows 绝对路径，只检查除了驱动器号后的冒号之外的其他无效字符
        const pathWithoutDrive = trimmedPath.substring(2);
        hasInvalidChars = /[<>:"|?*]/ .test(pathWithoutDrive);
      } else {
        hasInvalidChars = true;
      }
    }
    
    if (hasInvalidChars) {
      return { valid: false, error: '路径包含无效字符（<>:"|?*）', path: null };
    }

    // 将路径转换为绝对路径
    let absolutePath;
    try {
      absolutePath = path.resolve(trimmedPath);
    } catch (error) {
      return { valid: false, error: `路径解析失败: ${error.message}`, path: null };
    }

    return { valid: true, error: null, path: absolutePath };
  } catch (error) {
    return { valid: false, error: `验证失败: ${error.message}`, path: null };
  }
};

/**
 * 更新回收站目录设置
 * @param {string} dirPath - 目录路径（可以是相对路径或绝对路径）
 * @returns {Object} - 操作结果 { success: boolean, message: string }
 */
const updateRecycleBinDir = (dirPath) => {
  try {
    // 验证路径
    const validation = validateRecycleBinPath(dirPath);
    if (!validation.valid) {
      logger.warn(`更新回收站目录失败: ${dirPath}`, { error: validation.error });
      return { success: false, message: `[ERROR] 更新回收站目录失败: ${validation.error}` };
    }

    let yamlContent;
    
    if (fs.existsSync(CONFIG_FILE)) {
      // 读取现有配置文件的原始内容
      const existingContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      
      // 查找 targetDirectory 字段的位置
      // 匹配包含 targetDirectory: 的行
      const targetDirMatch = existingContent.match(/targetDirectory:\s*["']?[^"'\n]+["']?/m);
      
      if (targetDirMatch) {
        // 找到 targetDirectory 字段，替换其值
        const newTargetDirLine = `targetDirectory: "${validation.path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
        yamlContent = existingContent.replace(/targetDirectory:\s*["']?[^"'\n]+["']?/m, newTargetDirLine);
      } else {
        // 没有找到 targetDirectory 字段，查找 moveConfig 部分
        const moveConfigMatch = existingContent.match(/moveConfig:\s*$/m);
        
        if (moveConfigMatch) {
          // 找到 moveConfig 部分，在其下方添加 targetDirectory 字段
          const moveConfigEndIndex = moveConfigMatch.index + moveConfigMatch[0].length;
          const indentation = moveConfigMatch[0].match(/^\s*/)[0] || '';
          const newTargetDirLine = `\n${indentation}  # 文件移动目标目录（支持绝对路径或相对于项目根目录的路径）\n${indentation}  targetDirectory: "${validation.path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
          yamlContent = existingContent.slice(0, moveConfigEndIndex) + newTargetDirLine + existingContent.slice(moveConfigEndIndex);
        } else {
          // 没有找到 moveConfig 部分，在文件末尾添加
          yamlContent = existingContent + '\n\n# 回收站目录设置\nmoveConfig:\n  # 文件移动目标目录（支持绝对路径或相对于项目根目录的路径）\n  targetDirectory: "' + validation.path.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"\n';
        }
      }
    } else {
      // 配置文件不存在，创建默认配置
      yamlContent = `# 清理脚本配置文件
# 定义清理规则和保留策略

# 默认文件保留天数（单位：天）
retentionDays: 0

# 允许删除的文件扩展名列表（区分大小写），使用"*"代表处理所有文件
allowedExtensions:
  - docx
  - xlsx
  - csv
  - pptx
  - txt

# 系统保护文件列表（文件名，不区分大小写）
protectedFiles:
  - desktop.ini
  - thumbs.db
  - $recycle.bin
  - system volume information

# 日志配置
logConfig:
  # 日志级别：error, warn, info, verbose, debug, silly
  level: info
  # 日志文件路径
  filePath: logs/cleanup.log
  # 日志文件最大大小（单位：MB）
  maxSize: 10
  # 日志文件最大数量
  maxFiles: 5

# 回收站目录设置
moveConfig:
  # 文件移动目标目录（支持绝对路径或相对于项目根目录的路径）
  targetDirectory: "./trash"

# 要清理的文件夹列表（绝对路径）
folders:

`;
    }

    // 保存配置
    fs.writeFileSync(CONFIG_FILE, yamlContent, 'utf8');
    logger.info(`成功更新回收站目录: ${validation.path}`);
    return { success: true, message: `[SUCCESS] 回收站目录更新成功: ${validation.path}` };
  } catch (error) {
    logger.error(`更新回收站目录失败`, { error: error.message });
    return { success: false, message: `[ERROR] 更新回收站目录失败: ${error.message}` };
  }
};

/**
 * 保存配置文件
 * @param {Array} folders - 文件夹路径列表
 * @returns {boolean} - 保存是否成功
 */
const saveConfig = (folders) => {
  try {
    let yamlContent;
    
    if (fs.existsSync(CONFIG_FILE)) {
      // 读取现有配置文件的原始内容
      const existingContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      
      // 生成新的folders部分内容
      const newFoldersSection = `folders:
${folders.map(folder => {
  // 直接使用路径字符串，确保反斜杠正确处理
  return `  - "${folder.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}).join('\n')}`;
      
      // 查找folders部分的开始和结束位置
      // 匹配包含folders:的行，忽略前面的内容
      const foldersLineMatch = existingContent.match(/.*folders:\s*$/m);
      const foldersStartMatch = foldersLineMatch ? {
        index: foldersLineMatch.index + foldersLineMatch[0].indexOf('folders:'),
        0: 'folders:'
      } : null;
      
      if (foldersStartMatch) {
        // 找到folders部分，确定其范围
        const foldersStartIndex = foldersStartMatch.index;
        
        // 找到下一个顶级键的开始位置，作为folders部分的结束位置
        // 顶级键的模式：行首（可能有空格）后跟非空格字符，然后是冒号
        // 从folders行之后开始查找，跳过当前的folders行
        const foldersLineEnd = existingContent.indexOf('\n', foldersStartIndex);
        const contentAfterFoldersLine = foldersLineEnd !== -1 
          ? existingContent.slice(foldersLineEnd) 
          : '';
        
        const nextTopLevelKeyMatch = contentAfterFoldersLine.match(/^\s*[^\s:]+:\s*$/m);
        let foldersEndIndex;
        
        if (nextTopLevelKeyMatch) {
          // 找到了下一个顶级键，使用其开始位置作为结束位置
          foldersEndIndex = foldersLineEnd + nextTopLevelKeyMatch.index;
        } else {
          // 没有找到下一个顶级键，使用文件末尾作为结束位置
          foldersEndIndex = existingContent.length;
        }
        
        // 提取folders部分之前和之后的内容
      const beforeFolders = existingContent.slice(0, foldersStartIndex);
      let afterFolders = existingContent.slice(foldersEndIndex);
      
      // 去除afterFolders开头的空白行，避免重复添加换行符
      afterFolders = afterFolders.replace(/^\s*\n/, '');
      
      // 重新组合内容，只替换folders部分
      yamlContent = beforeFolders + newFoldersSection;
      
      // 只有当afterFolders不为空时，才添加换行符和afterFolders
      if (afterFolders.trim()) {
        yamlContent += '\n' + afterFolders;
      }
      } else {
        // 没有找到folders部分，在文件末尾添加
        yamlContent = existingContent + '\n\n# 要清理的文件夹列表（绝对路径）\n' + newFoldersSection;
      }
    } else {
      // 配置文件不存在，创建默认配置
      yamlContent = `# 清理脚本配置文件
# 定义清理规则和保留策略

# 默认文件保留天数（单位：天）
retentionDays: 0

# 允许删除的文件扩展名列表（区分大小写），使用"*"代表处理所有文件
allowedExtensions:
  - docx
  - xlsx
  - csv
  - pptx
  - txt

# 系统保护文件列表（文件名，不区分大小写）
protectedFiles:
  - desktop.ini
  - thumbs.db
  - $recycle.bin
  - system volume information

# 日志配置
logConfig:
  # 日志级别：error, warn, info, verbose, debug, silly
  level: info
  # 日志文件路径
  filePath: logs/cleanup.log
  # 日志文件最大大小（单位：MB）
  maxSize: 10
  # 日志文件最大数量
  maxFiles: 5
  
# 回收站目录设置
moveConfig:
  # 文件移动目标目录（支持绝对路径或相对于项目根目录的路径）
  targetDirectory: "trash"

# 要清理的文件夹列表（绝对路径）
folders:

`;
    }
    
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
    return { success: false, message: `[ERROR] 添加文件夹失败: ${validation.error}` };
  }
  
  // 使用绝对路径
  const absolutePath = validation.absolutePath;
  
  // 检查是否已存在
  if (folders.includes(absolutePath)) {
    logger.warn(`文件夹已存在: ${absolutePath}`);
    return { success: false, message: '[ERROR] 文件夹已存在于配置中' };
  }
  
  // 添加文件夹
  folders.push(absolutePath);
  
  // 保存配置
  if (saveConfig(folders)) {
    logger.info(`成功添加文件夹: ${absolutePath}`);
    return { success: true, message: `[SUCCESS] 文件夹添加成功: ${absolutePath}` };
  } else {
    return { success: false, message: '[ERROR] 保存配置失败' };
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
  
  // 验证旧路径
  const oldValidation = validateFolderPath(oldPath);
  if (!oldValidation.valid) {
    logger.warn(`修改文件夹失败: ${oldPath}`, { error: oldValidation.error });
    return { success: false, message: `[ERROR] 修改文件夹失败: ${oldValidation.error}` };
  }
  
  // 使用旧路径的绝对路径
  const oldAbsolutePath = oldValidation.absolutePath;
  
  // 检查旧路径是否存在
  const index = folders.indexOf(oldAbsolutePath);
  if (index === -1) {
    logger.warn(`要修改的文件夹不存在: ${oldAbsolutePath}`);
    return { success: false, message: '[ERROR] 要修改的文件夹不存在于配置中' };
  }
  
  // 验证新路径
  const newValidation = validateFolderPath(newPath);
  if (!newValidation.valid) {
    logger.warn(`修改文件夹失败: ${newPath}`, { error: newValidation.error });
    return { success: false, message: `[ERROR] 修改文件夹失败: ${newValidation.error}` };
  }
  
  // 使用新路径的绝对路径
  const newAbsolutePath = newValidation.absolutePath;
  
  // 检查新路径是否已存在（排除自身）
  if (folders.includes(newAbsolutePath) && newAbsolutePath !== oldAbsolutePath) {
    logger.warn(`新文件夹路径已存在: ${newAbsolutePath}`);
    return { success: false, message: '[ERROR] 新文件夹路径已存在于配置中' };
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
  loadConfig,
  saveConfig,
  getRecycleBinDir,
  updateRecycleBinDir
};
