# file-cleanup-cli

一个基于 Node.js 的命令行文件清理工具，可按扩展名、保留天数批量移动并压缩指定文件夹及其子目录中的旧文件到指定的垃圾文件处理目录，并提供配置管理、系统保护与详细日志。

## 功能特性

- 📁 **多文件夹管理** - 支持配置多个文件夹进行清理
- ⏰ **灵活的保留策略** - 自定义文件保留天数
- 🔒 **文件格式限制** - 只移动指定格式的文件
- 🛡️ **系统保护** - 自动保护系统文件和重要文件
- 📊 **详细日志** - 完整的操作日志记录
- 🚀 **全局安装** - 全局安装后可在任何位置使用
- 🔄 **递归清理** - 自动清理子文件夹中的符合条件文件
- 🔍 **文件使用检查** - 避免移动正在使用的文件
- 📝 **相对路径支持** - 支持使用相对路径配置清理文件夹
- 📦 **文件移动与压缩** - 将文件移动到指定目录并自动压缩为ZIP格式
- 📋 **目录结构保留** - 压缩时保留原始文件结构和属性
- ✅ **完整性验证** - 压缩后自动验证ZIP文件完整性

## 安装

### 环境要求

- **Node.js**: >= 22.0.0
- **npm**: >= 10.0.0 (通常随 Node.js 一起安装)
- **操作系统**: Windows 10 或以上版本

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

- `-d, --days <天数>` - 指定文件保留天数（默认: 7天），**必须与--clear参数搭配使用才能生效**
- `--clear` - 执行文件清理操作
- `-f, --force` - 跳过所有确认提示，直接执行相应操作（适用于--clear和--configclear等需要确认的操作）

#### 配置管理选项

- `--add <路径>` - 添加文件夹到配置（支持绝对路径和相对路径）
- `--remove <路径>` - 从配置中删除文件夹（支持绝对路径和相对路径）
- `--update <旧路径> <新路径>` - 修改配置中的文件夹路径（支持绝对路径和相对路径）
- `--list` - 列出所有配置的文件夹
- `--configclear` - 清空所有文件夹配置

#### 其他选项

- `-h, --help` - 显示帮助信息
- `-v, --version` - 显示版本信息

## 参数组合规则

### 核心规则
1. **-d, --days 参数** - 必须与 `--clear` 参数搭配使用才能生效
   - 单独使用 `-d` 或 `--days` 参数时，系统将忽略该参数设置
   - 该参数仅在执行清理操作时有效，用于临时覆盖默认保留天数

2. **-f, --force 参数** - 可以与需要确认的操作参数搭配使用
   - 与 `--clear` 搭配：跳过通配符*的确认提示
   - 与 `--configclear` 搭配：跳过清空配置的确认提示
   - 使用此参数时请格外谨慎，因为它会跳过所有安全确认步骤

### 使用场景
1. **默认保留天数清理** - 当您想使用配置文件中的默认保留天数（7天）进行清理时
   ```bash
   file-cleanup --clear
   ```

2. **自定义保留天数清理** - 当您需要临时使用特定的保留天数进行清理时
   ```bash
   file-cleanup --clear --days 30
   ```

3. **通配符清理（跳过确认）** - 当配置文件中allowedExtensions设置为"*"且需要跳过确认提示时
   ```bash
   file-cleanup --clear --force
   ```

4. **自定义天数的通配符清理（跳过确认）** - 结合自定义保留天数和跳过确认提示
   ```bash
   file-cleanup --clear --days 15 --force
   ```

5. **跳过确认的配置清空** - 当您需要清空所有文件夹配置且无需确认时
   ```bash
   file-cleanup --configclear --force
   ```

6. **配置管理** - 当您仅需管理清理配置（添加、删除、修改文件夹）时
   ```bash
   file-cleanup --add ./logs
   file-cleanup --remove ./logs
   file-cleanup --list
   ```

### 无效参数组合示例
以下参数组合将不会产生预期效果，系统会忽略多余的参数：
- `file-cleanup --days 30` - 仅指定天数，未执行清理操作
- `file-cleanup --add ./logs --days 30` - 配置操作中使用天数参数
- `file-cleanup --list --days 30` - 列表操作中使用天数参数

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

#### 清空所有文件夹配置

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
# 支持通配符 `*` 表示所有文件类型
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

# 文件移动配置
moveConfig:
  # 文件移动目标目录（支持绝对路径或相对于项目根目录的路径）
  targetDirectory: trash
  # 是否在移动完成后自动压缩
  enableCompression: true
  # 压缩包名称前缀
  compressionPrefix: cleanup_
  # 压缩完成后是否删除源文件（移动目录中的文件）
  deleteAfterCompression: true
```

## 清理规则

1. **文件保留策略** - 只删除超过指定天数的文件
   - 同时检查文件的创建时间和修改时间，使用最新时间计算文件年龄
   - 确保即使文件创建时间无效也能正确判断

2. **文件格式限制** - 只删除配置中允许的文件格式
   - 通过文件扩展名进行判断（区分大小写）
   - 可以在配置文件中灵活添加或移除支持的格式
   - 支持通配符 `*` 表示所有文件类型

3. **系统保护** - 自动跳过系统保护文件
   - 保护系统关键文件如 `desktop.ini`, `thumbs.db`,系统根目录等
   - 可在配置文件中扩展保护文件列表

4. **文件使用检查** - 避免删除正在使用的文件
   - 尝试以写入模式打开文件，如果失败则跳过
   - 防止因删除正在使用的文件导致的系统错误

5. **递归清理** - 自动清理子文件夹
   - 深入所有子文件夹查找符合条件的文件
   - 保持文件夹结构不变

6. **日志记录** - 完整记录所有操作
   - 记录成功移动的文件
   - 记录跳过的文件及其原因
   - 记录错误信息以便排查问题

7. **文件移动** - 将符合条件的文件移动到指定目录
   - 支持配置移动目标目录
   - 保留原始文件的目录结构
   - 自动处理文件名冲突

8. **文件压缩** - 可选的自动压缩功能
   - 使用标准ZIP格式和DEFLATE算法
   - 保留文件的原始结构、名称和属性
   - 压缩后自动验证ZIP文件的完整性
   - 可配置压缩后是否删除源文件

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
- Windows 10 或以上版本

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

