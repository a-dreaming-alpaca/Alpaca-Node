# 开发交接

更新日期：2026-10-30（Asia/Shanghai）。本文件记录项目进度，稳定约定见 `AGENTS.md`，完整使用说明见 `README.md`。

## 当前基线

- 仓库：<https://github.com/a-dreaming-alpaca/Alpaca-Node>，SSH remote 为 `git@github.com:a-dreaming-alpaca/Alpaca-Node.git`。
- 最近功能提交：`c217999`，状态记忆与性格设置；已推送至 `master`。前一功能提交 `b8c485a` 合并显卡兼容性和原薄荷主导配色。
- 2026-10-30 本次只补充开发交接文档。之后的最新提交、分支和未提交改动请重新查看 Git。
- 源码直接放在仓库根目录，已从旧 `Alpaca-Node-v12/` 子目录归并。旧 ZIP 是历史发布内容，不包含之后所有更新，不能用来覆盖当前源码。

## 已完成

- 原薄荷主导配色、浅紫正脸 0/1 留白轮廓。白填充已经撤回；`alpaca-outline/` 是独立静态研究，正式动效在 `wallpaper/app.js`。
- 左羊驼／中汇报／右监控，底部 CPU、内存、I/O 前四名；最新消息常驻，旧消息淡出，汇报正文与监控首行对齐。
- GPU：NVIDIA SMI 优先，缺失时使用 Windows WDDM；专用与共享内存分开显示，不因核显小专用池接近满额误报。
- 本机 CPU、内存、GPU、网络、磁盘、进程排行、CPU 趋势、开机流量估计及真实系统事件；可选只读校园网状态/重连日志联动。
- 51 条课件英文引用及羊驼短句；真实事件和高负载优先，最近 10 条引用、5 条短句暂不重复。
- 状态记忆保存最新一条汇报及原时间、闲聊剩余等待、重复规避记录与提醒冷却。切走期间冻结闲聊余量，提醒冷却按真实时间流逝；恢复不重播历史事件或沿用旧负载证据。
- Wallpaper Engine 属性：`personality`、`quotes`、`smalltalk`、`memory`。默认标准、两个文案开关和记忆开启；关闭记忆会清除专属记录，真实状态提醒仍保留。

| 性格 | 首次／安静后等待 | 后续随机闲聊间隔 |
| --- | --- | --- |
| 安静 `quiet` | 6 分钟 | 8–12 分钟 |
| 标准 `standard` | 3 分钟 | 3–6 分钟 |
| 健谈 `chatty` | 1 分钟 | 1–3 分钟 |

两个文案开关均开启时，70% 为引用、30% 为短句；只开启一种时只使用该类型。CPU ≥65%、GPU ≥75% 或内存 ≥85% 会推迟闲聊。事件/负载汇报、实际断线及采样间断也会影响等待；正常记忆恢复保留剩余时间。

## 源码定位

| 入口 | 职责 |
| --- | --- |
| `wallpaper/index.html` / `style.css` | 信息结构、三栏布局与颜色 |
| `wallpaper/app.js` | 实时读数、Canvas 动效、属性回调及记忆接入 |
| `wallpaper/reports.js` | 汇报/闲聊决策、性格、核心快照与恢复 |
| `wallpaper/memory.js` | localStorage 适配器、记录校验、异常降级 |
| `wallpaper/project.json` | Wallpaper Engine 属性定义 |
| `collector.ps1` | 本地 HTTP 服务与采样协调 |
| `telemetry-gpu.ps1` / `gpu-adapters.cs` | GPU 采集与 DXGI 映射 |
| `telemetry-extra.ps1` / `campus-status.py` | 系统事件、流量与可选校园网联动 |
| `tools/` | 引用提取/同步、发布清单及 GPU 检查 |

脚本加载顺序为 `reports.js` → `memory.js` → `app.js`。记忆键是 `alpaca-node.memory.v1`，上限 32 KiB，记录有效期 30 天；浏览器与 Wallpaper Engine 各自存储，不能假定共享记忆。

## 验证与部署状态

2026-10-29 已通过：

- 三份网页 JS 语法检查；`test-reports.cjs`、`test-memory.cjs`、`test-app-memory.cjs`。
- 汇报优先级、引用去重、性格间隔、初始设置幂等、恢复冷却、损坏/禁用存储、暂停与飞行请求隔离、pagehide/pageshow。
- `test-campus-events.ps1` 和 `tools/test-gpu.ps1`；之前在本机实测过 NVIDIA SMI 及 Windows WDDM 采集路径。其他实际显卡和驱动仍需对应设备验证。
- 普通浏览器真实重新加载：旧汇报及时间保留，CPU/内存重新读取，页面无脚本错误。

2026-10-30 只读复核：本机已导入项目的 app/reports/memory/index/style 五文件与源码哈希一致，新增属性定义已存在，轮换列表仍为 20 项。具体路径见未入库的 `LOCAL_SETUP.md`。本次没有重跑功能测试，也没有重新打包。

**待核验**：Wallpaper Engine 真实右侧控件的显示/切换，以及宿主实际轮换/暂停后的记忆恢复，尚未通过其原生界面实测。上次自动打开设置窗口失败；Node 模拟和浏览器刷新检查已通过，但不等同于宿主验证。后续有机会优先核验，不要据此自动改动轮换列表。

## 后续方向与交接维护

用户尚未选择下一项功能。曾讨论更有信息量的汇报、与内容呼应的动作、更新与回滚工具；它们尚未实现，不应直接开始。

接手新任务时先查看当前 Git、读取相关源码和本机配置，保留未提交改动。完成后更新本文件的功能基线、实际检查与部署范围；详细操作说明仍放 README，固定偏好放 AGENTS，本机路径放 LOCAL_SETUP。
