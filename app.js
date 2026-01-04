/**
 * 主入口文件
 * 支持命令行参数指定多个文件夹进行清理
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import logger from './logger.js';
import { executeCleanup } from './cleaner.js';
import {
  addFolder,
  removeFolder,
  updateFolder,
  getAllFolders,
  clearAllFolders,
  validateFolderPath
} from './configManager.js';
import readline from 'readline';

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
 * 解析命令行参数
 * @returns {Object} - 解析后的参数对象，包含错误信息（如果有）
 */
const parseArguments = () => {
  const args = process.argv.slice(2);
  const result = {
    retentionDays: config.retentionDays,
    action: 'help',
    configPath: null,
    configNewPath: null,
    error: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // 解析 --days 参数
    if (arg === '--days' || arg === '-d') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        const days = parseInt(nextArg);
        if (!isNaN(days) && days >= 0) {
          result.retentionDays = days;
        } else {
          result.error = {
            type: 'invalid',
            option: '--days',
            message: '天数参数必须是一个非负整数'
          };
          return result;
        }
        i++;
      } else {
        result.error = {
          type: 'missing',
          option: '--days',
          message: '--days 选项需要提供一个非负整数参数'
        };
        return result;
      }
    }
    
    // 解析 --add 参数（添加文件夹到配置）
    if (arg === '--add') {
      result.action = 'add';
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        result.configPath = nextArg;
        i++;
      } else {
        result.error = {
          type: 'missing',
          option: '--add',
          message: '--add 选项需要提供一个文件夹路径参数'
        };
        return result;
      }
    }
    
    // 解析 --remove 参数（从配置中删除文件夹）
    if (arg === '--remove') {
      result.action = 'remove';
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        result.configPath = nextArg;
        i++;
      } else {
        result.error = {
          type: 'missing',
          option: '--remove',
          message: '--remove 选项需要提供一个文件夹路径参数'
        };
        return result;
      }
    }
    
    // 解析 --update 参数（修改配置中的文件夹路径）
    if (arg === '--update') {
      result.action = 'update';
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        result.configPath = nextArg;
        i++;
        const nextNextArg = args[i + 1];
        if (nextNextArg && !nextNextArg.startsWith('-')) {
          result.configNewPath = nextNextArg;
          i++;
        } else {
          result.error = {
            type: 'missing',
            option: '--update',
            message: '--update 选项需要提供两个文件夹路径参数：旧路径和新路径'
          };
          return result;
        }
      } else {
        result.error = {
          type: 'missing',
          option: '--update',
          message: '--update 选项需要提供两个文件夹路径参数：旧路径和新路径'
        };
        return result;
      }
    }
    
    // 解析 --list 参数（列出所有配置的文件夹）
    if (arg === '--list') {
      result.action = 'list';
    }
    
    // 解析 --clear 参数（执行文件清理）
    if (arg === '--clear') {
      result.action = 'clear';
    }
    
    // 解析 --configclear 参数（清空所有配置）
    if (arg === '--configclear') {
      result.action = 'configclear';
    }
    
    // 解析 --help 参数
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
    
    // 解析 --version 参数
    if (arg === '--version' || arg === '-v') {
      showVersion();
      process.exit(0);
    }
  }
  
  return result;
};

/**
 * 显示版本信息
 */
const showVersion = () => {
  const packagePath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`file-cleanup-cli v${packageJson.version}`);
};

/**
 * 显示帮助信息
 */
const showHelp = () => {
  console.log('file-cleanup-cli - 文件清理命令行工具');
  console.log('');
  console.log('用法:');
  console.log('  file-cleanup [选项]');
  console.log('');
  console.log('清理操作选项:');
  console.log('  --clear               执行文件清理操作');
  console.log('  -d, --days <天数>     指定文件保留天数（默认: 7天），必须与--clear参数搭配使用才能生效');
  console.log('');
  console.log('配置管理选项:');
  console.log('  --add <路径>          添加文件夹到配置（支持绝对路径和相对路径）');
  console.log('  --remove <路径>       从配置中删除文件夹（支持绝对路径和相对路径）');
  console.log('  --update <旧路径> <新路径>  修改配置中的文件夹路径（支持绝对路径和相对路径）');
  console.log('  --list                列出所有配置的文件夹');
  console.log('  --configclear         清空所有配置');
  console.log('');
  console.log('其他选项:');
  console.log('  -h, --help            显示帮助信息');
  console.log('  -v, --version         显示版本信息');
  console.log('');
  console.log('相对路径使用说明:');
  console.log('  - 支持当前目录相对路径: ./subfolder, ./file.txt');
  console.log('  - 支持上级目录相对路径: ../parentfolder, ../../grandparentfolder');
  console.log('  - 支持多级相对路径: ./subfolder1/subfolder2, ../parentfolder/subfolder');
  console.log('  - 相对路径会自动转换为绝对路径存储在配置文件中');
  console.log('');
  console.log('示例:');
  console.log('  # 配置管理（使用绝对路径）');
  console.log('  file-cleanup --add "E:/temp/logs"');
  console.log('  file-cleanup --remove "E:/temp/logs"');
  console.log('  file-cleanup --update "E:/temp/logs" "E:/temp/new_logs"');
  console.log('  file-cleanup --list');
  console.log('  file-cleanup --configclear');
  console.log('');
  console.log('  # 配置管理（使用相对路径）');
  console.log('  file-cleanup --add ./logs');
  console.log('  file-cleanup --add ../temp/files');
  console.log('  file-cleanup --remove ./logs');
  console.log('  file-cleanup --update ./old-folder ./new-folder');
  console.log('');
  console.log('  # 执行清理');
  console.log('  file-cleanup --clear --days 30');
  console.log('');
  console.log('注意事项:');
  console.log('  - 当未指定任何选项时，默认显示此帮助文档');
  console.log('  - 清理操作仅在配置了文件夹且使用了相关选项时执行');
  console.log('  - -d, --days 参数必须与 --clear 参数搭配使用才能生效');
  console.log('  - 系统会自动跳过正在使用的文件，避免因删除正在使用的文件导致系统错误');
  console.log('');
};

/**
 * 主函数
 */
const main = () => {
  logger.info('=== 文件清理脚本启动 ===');
  
  // 解析命令行参数
  const params = parseArguments();
  
  // 检查参数解析错误
  if (params.error) {
    console.error('❌ ' + params.error.message);
    console.log('');
    console.log('使用 --help 查看详细用法');
    logger.error(params.error.message);
    process.exit(1);
  }
  
  // 根据操作类型执行不同功能
  switch (params.action) {
    case 'help':
      showHelp();
      process.exit(0);
      break;
    case 'add':
      // 添加文件夹到配置
      // 注意：由于在parseArguments中已经验证了--add参数需要路径，这里的检查作为双重保障
      if (!params.configPath) {
        console.error('❌ 错误: --add 选项需要提供一个文件夹路径参数');
        console.log('用法: file-cleanup --add <路径>');
        logger.error('--add 选项缺少文件夹路径参数');
        process.exit(1);
      }
      const addResult = addFolder(params.configPath);
      console.log(addResult.message);
      process.exit(addResult.success ? 0 : 1);
      
    case 'remove':
      // 从配置中删除文件夹
      // 注意：由于在parseArguments中已经验证了--remove参数需要路径，这里的检查作为双重保障
      if (!params.configPath) {
        console.error('❌ 错误: --remove 选项需要提供一个文件夹路径参数');
        console.log('用法: file-cleanup --remove <路径>');
        logger.error('--remove 选项缺少文件夹路径参数');
        process.exit(1);
      }
      const removeResult = removeFolder(params.configPath);
      console.log(removeResult.message);
      process.exit(removeResult.success ? 0 : 1);
      
    case 'update':
      // 修改配置中的文件夹路径
      // 注意：由于在parseArguments中已经验证了--update参数需要两个路径，这里的检查作为双重保障
      if (!params.configPath || !params.configNewPath) {
        console.error('❌ 错误: --update 选项需要提供两个文件夹路径参数：旧路径和新路径');
        console.log('用法: file-cleanup --update <旧路径> <新路径>');
        logger.error('--update 选项缺少必要的路径参数');
        process.exit(1);
      }
      const updateResult = updateFolder(params.configPath, params.configNewPath);
      console.log(updateResult.message);
      process.exit(updateResult.success ? 0 : 1);
      
    case 'list':
      // 列出所有配置的文件夹
      const folders = getAllFolders();
      console.log('已配置的文件夹路径:');
      if (folders.length === 0) {
        console.log('  (无)');
      } else {
        folders.forEach((folder, index) => {
          console.log(`  ${index + 1}. ${folder}`);
        });
      }
      process.exit(0);
      
    case 'configclear':
      // 清空所有配置
      console.log('=== 清空配置操作 ===');
      console.log('确定要清空所有文件夹配置吗？(y/n)');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('', (answer) => {
        rl.close();
        console.log('');
        if (answer.toLowerCase() === 'y') {
          console.log('正在清空所有文件夹配置...');
          const clearResult = clearAllFolders();
          console.log('');
          if (clearResult.success) {
            console.log('✅ ' + clearResult.message);
            console.log('=== 清空配置操作完成 ===');
            process.exit(0);
          } else {
            console.log('❌ ' + clearResult.message);
            console.log('=== 清空配置操作失败 ===');
            process.exit(1);
          }
        } else {
          console.log('❌ 操作已取消');
          console.log('=== 清空配置操作终止 ===');
          process.exit(0);
        }
      });
      return;
      
    case 'clear':
      // 清理操作
      console.log('=== 文件清理操作 ===');
      console.log('正在准备清理任务...');

      // 从配置文件读取文件夹
      const configFolders = getAllFolders();
      if (configFolders.length === 0) {
        logger.error('配置文件中没有配置任何文件夹');
        console.log('');
        console.log('❌ 错误: 配置文件中没有配置任何文件夹');
        console.log('');
        console.log('请使用以下方式之一:');
        console.log('  1. 使用 --add 参数添加文件夹到配置');
        console.log('  2. 使用 --list 查看已配置的文件夹');
        console.log('');
        console.log('=== 文件清理操作终止 ===');
        process.exit(1);
      }

      // 更新配置中的保留天数
      config.retentionDays = params.retentionDays;

      console.log(`\n🔍 清理参数:`);
      console.log(`   目标文件夹: ${configFolders.join(', ')}`);
      console.log(`   保留天数: ${params.retentionDays}天`);
      console.log(`   允许删除的文件类型: ${config.allowedExtensions.join(', ')}`);
      console.log(`   开始时间: ${new Date().toLocaleString()}`);

      logger.info(`清理参数: 文件夹=${configFolders.join(', ')}, 保留天数=${params.retentionDays}, 允许的扩展名=${config.allowedExtensions.join(', ')}`);

      // 当配置为删除所有文件（"*"）时，添加确认机制
      if (config.allowedExtensions.includes('*')) {
        console.log('\n⚠️  警告: 检测到通配符配置（"*"），将删除所有文件类型！');
        console.log('   此操作可能会导致大量文件被删除，建议谨慎执行。');
        console.log('   请确认是否继续执行？(y/n)');
        
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        rl.question('', (answer) => {
          rl.close();
          console.log('');
          
          if (answer.toLowerCase() === 'y') {
            console.log('📦 正在执行清理任务...');
            // 执行清理任务
            const result = executeCleanup(configFolders, params.retentionDays);
            
            console.log('\n✅ 文件清理任务完成!');
            console.log(`   总计检查文件: ${result.totalFiles}个`);
            console.log(`   成功删除文件: ${result.deletedFiles}个`);
            console.log(`   跳过文件: ${result.skippedFiles}个`);
            console.log(`   结束时间: ${new Date().toLocaleString()}`);
            console.log('=== 文件清理操作完成 ===');
            
            logger.info('=== 文件清理脚本结束 ===');
            process.exit(0);
          } else {
            console.log('❌ 操作已取消');
            console.log('=== 文件清理操作终止 ===');
            logger.info('清理操作已被用户取消');
            process.exit(0);
          }
        });
        
        return;
      }

      console.log('\n📦 正在执行清理任务...');

      // 执行清理任务
      const result = executeCleanup(configFolders, params.retentionDays);

      console.log('\n✅ 文件清理任务完成!');
      console.log(`   总计检查文件: ${result.totalFiles}个`);
      console.log(`   成功删除文件: ${result.deletedFiles}个`);
      console.log(`   跳过文件: ${result.skippedFiles}个`);
      console.log(`   结束时间: ${new Date().toLocaleString()}`);
      console.log('=== 文件清理操作完成 ===');

      logger.info('=== 文件清理脚本结束 ===');
      break;

    default:
      // 默认显示帮助
      showHelp();
      process.exit(0);
  }
};

// 启动脚本
main();