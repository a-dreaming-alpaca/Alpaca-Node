# 提取 DSA 课件首页英文引用

双击项目根目录的 `Extract-DSA-Quotes.cmd`，即可重新提取。脚本递归扫描指定课件目录，只读取每份 PDF 的第一页，原课件不会被修改。

课件目录按以下顺序选择：

1. 命令行 `--source` 参数。
2. `DSA_PDF_SOURCE` 环境变量。
3. 项目根目录的 `.dsa-quotes-source` 本机配置文件：用 UTF-8 纯文本写一行课件目录路径，不加引号。

未设置任何来源时，脚本会提示指定 `--source`。`.dsa-quotes-source` 被 Git 忽略，本机路径不会随仓库同步；换电脑后重新设置即可。配置完成后，双击启动脚本仍可直接使用。

输出位于 `output/dsa-quotes/`：

- `quotes.md`：方便阅读的名言列表。
- `quotes.csv`：用 Excel 打开，包含原文、作者、署名状态、来源。
- `quotes.json`：供后续壁纸文案程序读取；相同原文合并，保留所有来源和来源上的署名。
- `review.json`：可能是标题、口诀等的英文内容，供人工检查。
- `errors.json`：读取失败的文件及原因。
- `summary.json`：统计结果。
- `first-pages.txt`：首页文字备份，方便核对漏提取、断句或署名问题。

脚本以英文连续行、句子结构和署名分隔符筛选引用，排除邮箱、网址、中文课程标题和页码。不补写作者，不核实名言真实性，也不修正原课件中的拼写。没有文字层的 PDF 会列入待检查项，不会自动启动 OCR。

默认使用这台电脑已有的 Codex Python 运行环境。其他电脑需要 Python 和 `pypdf`：

```powershell
python -m pip install pypdf
python tools/extract_dsa_quotes.py --source "D:\你的课件目录" --output "output/dsa-quotes"
```

每次运行会覆盖指定输出目录中的同名结果文件。确认文案后，在项目根目录运行以下命令，将引用同步到壁纸内置文案库：

```powershell
python tools/sync_dsa_quotes.py
```

Wallpaper Engine 已导入的副本还需要同步更新 `wallpaper/reports.js` 并重新加载壁纸。
