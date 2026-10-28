# Alpaca Node

用于 Wallpaper Engine 的黑绿 ASCII 羊驼系统监控壁纸。羊驼会根据电脑负载改变状态、汇报系统事件，并在空闲时分享格言和短句。

## 功能

- CPU、物理内存、磁盘读写、网络速率及进程占用排行。
- 自动适配显卡：优先 NVIDIA SMI；不可用时使用 Windows WDDM 计数器，支持 AMD / Intel / NVIDIA。
- 分别显示专用 GPU 内存和共享系统内存，避免混淆核显的内存口径。
- 专用 GPU 内存占用不触发羊驼提醒，也不会因此推迟闲聊。
- 安静约 3 分钟后开始闲聊，之后随机间隔 3～6 分钟；70% 概率使用内置格言，30% 使用羊驼短句。状态汇报或高负载会延后闲聊。
- 本地采集、本地显示，无云端 AI 接口或数据上传；网页动画上限 15 FPS。

## 快速使用

需要 Windows 10/11 和 Wallpaper Engine，显卡通用采集依赖支持相应性能计数器的 WDDM 驱动。

1. 克隆仓库或下载解压到可写目录，保留目录结构。
2. 双击 `Alpaca-Node-v12/Start-Alpaca.cmd`，启动后台采集器。
3. 打开 <http://127.0.0.1:8765/> 检查预览。
4. 在 Wallpaper Engine 中导入 `Alpaca-Node-v12/wallpaper/index.html`，保存并应用。

采集器需要和壁纸同时运行。使用 `Stop-Alpaca.cmd` 可停止它；启动失败时检查 `collector-error.log`。安装包不自动设置开机启动，可自行将启动器快捷方式加入当前用户的 Windows 启动文件夹。基础功能不需要 Python，校园网联动是可选功能。

## 在源码目录直接修改

Wallpaper Engine 编辑器导入网页时会创建副本。如果希望直接使用仓库中的源码，可在 Wallpaper Engine 已运行时，通过其官方命令行接口加载本地项目：

```powershell
& '<Wallpaper Engine 安装目录>\wallpaper32.exe' -control openWallpaper -file '<仓库目录>\Alpaca-Node-v12\wallpaper\project.json'
```

修改后重新加载壁纸即可。也可在 Wallpaper Engine 的 `projects/myprojects` 中创建指向源码 `wallpaper` 目录的 Windows Junction，以保留壁纸库入口。移动仓库后，需要更新应用路径、目录链接和启动快捷方式。

## 修改入口

| 文件（位于 `Alpaca-Node-v12`） | 用途 |
| --- | --- |
| `wallpaper/index.html` | 页面结构 |
| `wallpaper/style.css` | 布局和样式 |
| `wallpaper/app.js` | 数值显示和羊驼动画 |
| `wallpaper/reports.js` | 状态汇报、格言和闲聊规则 |
| `collector.ps1` | Windows 数据采集和本地 HTTP 服务 |
| `telemetry-gpu.ps1` / `gpu-adapters.cs` | 跨厂商 GPU 采集和显卡映射 |
| `telemetry-extra.ps1` | 系统事件与开机流量估计 |

## 数据口径与限制

- Windows GPU 路径将同一物理引擎的进程利用率相加，再取最忙引擎；不会将并行引擎或不同显卡混算。
- 专用显存百分比只针对专用内存；共享内存上限不是已经分配的显存。核显的专用显存接近满额不代表全部 GPU 可用内存耗尽。
- Windows 通用路径不提供温度、功耗和风扇数据，这些字段显示 `--`。NVIDIA 路径保留驱动支持的传感器。
- 本机已实测 AMD Radeon 780M；其他厂商的硬件支持取决于驱动，未逐一实机验证。
- 服务只监听 `127.0.0.1:8765`，端口需保持可用。接口不是身份认证边界，同一电脑上的其他程序可能读取监控数据。
- 运行日志、进程编号、流量状态、本机设置和旧版备份均由 `.gitignore` 排除。

更多细节见 [完整说明](Alpaca-Node-v12/README.md)。GPU 逻辑检查可运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Alpaca-Node-v12\tools\test-gpu.ps1
```
