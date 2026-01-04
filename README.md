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
- 📝 **相对路径支持** - 支持使用相对路径配置清理文件夹

## 安装

### 环境要求

- **Node.js**: >= 22.0.0
- **npm**: >= 10.0.0 (通常随 Node.js 一起安装)
- **操作系统**: Windows / macOS / Linux

### 前置依赖

在安装本工具前，请确保您的系统已经安装了以下软件：

1. **Node.js** - 您可以从 [Node.js 官网](https://nodejs.org/) 下载并安装最新版本
2. **npm** - 通常随 Node.js 一起安装，也可以通过 `npm install -g npm@latest` 更新到最新版本

### 验证前置依赖

在开始安装前，建议先验证 Node.js 和 npm 是否正确安装：

```bash
# 检查 Node.js 版本
node -v

# 检查 npm 版本
npm -v
```

如果命令执行成功并显示版本号，说明前置依赖已经准备就绪。

### 安装方式

####  本地安装

本地安装仅在当前项目目录下可用，通常用于项目集成或开发场景。

```bash
# 进入您的项目目录
cd /path/to/your/project

# 安装到本地项目
npm install -g .

```

### 验证安装成功

安装完成后，可以通过以下方式验证安装是否成功：

#### 验证全局安装

```bash
# 检查工具版本
file-cleanup --version

# 查看帮助信息
file-cleanup --help
```

如果命令执行成功并显示版本信息或帮助文档，说明全局安装成功。




### 卸载工具

如果您需要卸载本工具，可以使用以下命令：

```bash
# 卸载全局安装的工具
npm uninstall -g file-cleanup-cli
```

## 使用方法

### 基本命令

```bash
file-cleanup [选项]
```

### 命令选项

#### 清理操作选项

- `-d, --days <天数>` - 指定文件保留天数（默认: 7天）
- `--clear` - 执行文件清理操作

#### 配置管理选项

- `--add <路径>` - 添加文件夹到配置（支持绝对路径和相对路径）
- `--remove <路径>` - 从配置中删除文件夹（支持绝对路径和相对路径）
- `--update <旧路径> <新路径>` - 修改配置中的文件夹路径（支持绝对路径和相对路径）
- `--list` - 列出所有配置的文件夹
- `--configclear` - 清空所有配置

#### 其他选项

- `-h, --help` - 显示帮助信息
- `-v, --version` - 显示版本信息

## 使用示例

### 配置管理（添加、删除、修改文件夹）

#### 添加文件夹到配置

```bash
# 使用绝对路径
file-cleanup --add "E:\temp\logs"

# 使用相对路径
file-cleanup --add ./logs
file-cleanup --add ../temp/files
```

#### 从配置中删除文件夹

```bash
# 使用绝对路径
file-cleanup --remove "E:\temp\logs"

# 使用相对路径
file-cleanup --remove ./logs
```

#### 修改配置中的文件夹路径

```bash
# 使用绝对路径
file-cleanup --update "E:\temp\logs" "E:\temp\new_logs"

# 使用相对路径
file-cleanup --update ./old-folder ./new-folder
```

#### 列出所有配置的文件夹

```bash
file-cleanup --list
```

#### 清空所有配置

```bash
file-cleanup --configclear
```

### 执行清理

#### 使用默认保留天数（7天）

```bash
file-cleanup --clear
```

#### 指定保留天数

```bash
file-cleanup --clear --days 30
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

## 相对路径使用说明

工具支持使用相对路径配置清理文件夹，路径解析规则如下：

- 当前目录相对路径：`./subfolder`, `./file.txt`
- 上级目录相对路径：`../parentfolder`, `../../grandparentfolder`
- 多级相对路径：`./subfolder1/subfolder2`, `../parentfolder/subfolder`

**注意**：相对路径会自动转换为绝对路径存储在配置文件中

## 系统要求

- Node.js >= 22.0.0
- npm >= 10.0.0
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


### 本地开发模式

```bash
npm start
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

Apache2.0 License

## 作者

whmyxh <hmyxhxjr@qq.com>

## 相关链接

- [GitHub 仓库](https://github.com/whmyxh/file-cleanup-cli.git)
- [问题反馈](https://github.com/whmyxh/file-cleanup-cli/issues)

