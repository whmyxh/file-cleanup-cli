# file-cleanup-cli

一个功能强大的文件清理命令行工具，支持基于配置的自动清理、文件格式限制、递归子文件夹清理和灵活的文件夹管理。

## 功能特性

- 📁 **多文件夹管理** - 支持配置多个文件夹进行清理
- ⏰ **灵活的保留策略** - 自定义文件保留天数
- 🔒 **文件格式限制** - 只删除指定格式的文件
- 🛡️ **系统保护** - 自动保护系统文件和重要文件
- 📊 **详细日志** - 完整的操作日志记录
- 🚀 **全局安装** - 全局安装后可在任何位置使用
- 🔄 **递归清理** - 自动清理子文件夹中的符合条件文件
- 🔍 **文件使用检查** - 避免删除正在使用的文件

## 安装

### 全局安装

```bash
npm install -g file-cleanup-cli
```

### 本地安装

```bash
npm install file-cleanup-cli
```

## 使用方法

### 基本命令

```bash
file-cleanup [选项]
```

### 命令选项

#### 清理选项

- `-d, --days <天数>` - 指定文件保留天数（默认: 7天）

#### 配置管理选项

- `--add <路径>` - 添加文件夹到配置
- `--remove <路径>` - 从配置中删除文件夹
- `--update <旧路径> <新路径>` - 修改配置中的文件夹路径
- `--list` - 列出所有配置的文件夹
- `--clear` - 清空所有配置

#### 其他选项

- `-h, --help` - 显示帮助信息
- `-v, --version` - 显示版本信息

## 使用示例

### 配置管理

#### 添加文件夹到配置

```bash
file-cleanup --add "E:\temp\logs"
```

#### 从配置中删除文件夹

```bash
file-cleanup --remove "E:\temp\logs"
```

#### 修改配置中的文件夹路径

```bash
file-cleanup --update "E:\temp\logs" "E:\temp\new_logs"
```

#### 列出所有配置的文件夹

```bash
file-cleanup --list
```

#### 清空所有配置

```bash
file-cleanup --clear
```

### 执行清理

#### 使用默认保留天数（7天）

```bash
file-cleanup
```

#### 指定保留天数

```bash
file-cleanup --days 30
```

## 配置文件

### config.yaml

配置文件位于安装目录下，包含以下配置项：

```yaml
# 清理脚本配置文件
# 定义清理规则和保留策略

# 默认文件保留天数（单位：天）
retentionDays: 7

# 允许删除的文件扩展名列表（区分大小写）
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

# 要清理的文件夹列表（绝对路径）
folders:
  - "E:\js_project\File_Deletion\test_folder_updated"
```

## 清理规则

1. **文件保留策略** - 只删除超过指定天数的文件
   - 同时检查文件的创建时间和修改时间，使用最新时间计算文件年龄
   - 确保即使文件创建时间无效也能正确判断

2. **文件格式限制** - 只删除配置中允许的文件格式
   - 通过文件扩展名进行判断（区分大小写）
   - 可以在配置文件中灵活添加或移除支持的格式

3. **系统保护** - 自动跳过系统保护文件
   - 保护系统关键文件如 `desktop.ini`, `thumbs.db` 等
   - 可在配置文件中扩展保护文件列表

4. **文件使用检查** - 避免删除正在使用的文件
   - 尝试以写入模式打开文件，如果失败则跳过
   - 防止因删除正在使用的文件导致的系统错误

5. **递归清理** - 自动清理子文件夹
   - 深入所有子文件夹查找符合条件的文件
   - 保持文件夹结构不变

6. **日志记录** - 完整记录所有操作
   - 记录成功删除的文件
   - 记录跳过的文件及其原因
   - 记录错误信息以便排查问题

## 日志文件

日志文件默认位于 `logs/cleanup.log`，包含以下信息：

- 操作时间戳
- 日志级别（INFO、WARN、ERROR）
- 操作详情
- 错误信息（如有）

## 系统要求

- Node.js >= 14.0.0
- Windows / macOS / Linux

## 开发

### 克隆仓库

```bash
git clone https://github.com/whmyxh/file-cleanup-cli.git
cd file-cleanup-cli
```

### 安装依赖

```bash
npm install
```

### 运行测试

```bash
npm test
```

### 本地开发模式

```bash
npm start
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 作者

whmyxh <hmyxhxjr@qq.com>

## 相关链接

- [GitHub 仓库](https://github.com/whmyxh/file-cleanup-cli.git)
- [问题反馈](https://github.com/whmyxh/file-cleanup-cli/issues)

## 更新日志

### v1.1.0 (2025-12-31)

- ✨ **递归清理功能** - 自动清理子文件夹中的符合条件文件
- 🎯 **改进的文件时间判断** - 同时检查创建时间和修改时间
- 🛡️ **文件使用检查** - 避免删除正在使用的文件
- 📝 **更新文档** - 完善README.md文件

### v1.0.0 (2025-12-30)

- 初始版本发布
- 支持基于配置的文件清理
- 支持文件格式限制
- 支持多文件夹管理
- 支持全局安装
- 完整的日志记录功能