# 在线 Note 编辑功能

## 概述

在吉他谱播放页面直接添加了 Songsterr 风格的在线 note 编辑功能。用户可以在播放器界面中实时修改音符的品数、弦号、时值、技巧标记等，修改即时渲染并播放试听，完成后可保存到服务器。

## 如何使用

1. 打开一个谱面页面
2. 点击工具栏上的 **Edit** 按钮进入编辑模式
3. **点击谱面上的任意音符或节拍区域**选中它（选中后音符会高亮显示为金色）
4. 使用键盘快捷键或面板上的按钮修改音符
5. 点击 **Save** 保存修改到服务器

## 编辑面板功能

| 功能 | 说明 |
|------|------|
| **品数 (Fret)** | +/- 按钮、数字输入框、键盘 ↑/↓ |
| **弦号 (String)** | 显示所有琴弦按钮（带音名），自动同步弦色 |
| **时值 (Duration)** | 下拉选择器：全音符/二分/四分/八分/十六分/三十二分 |
| **附点 (Dots)** | 点击循环切换 0-3 个附点 |
| **技巧标记** | Ghost(幽灵音)、Dead(制音)、Let Ring(延音)、Palm Mute(掌闷)、Staccato(断奏)、Slide(滑音)、Hammer On/Pull Off(锤弦/勾弦) |
| **拖拽修改品数** | 选中音符后，音符上方会出现拖拽手柄，上下拖拽改变品数 |
| **删除音符** | Delete 按钮或键盘 Delete/Backspace 键 |

## 键盘快捷键

| 键 | 功能 |
|---|------|
| ↑ / ↓ | 增加/减少品数 |
| [ / ] | 切换到上一根/下一根弦 |
| Delete / Backspace | 删除选中音符 |
| 1 / 2 / 3 / 4 / 5 / 6 | 设置时值（全音符到三十二分音符） |
| . (句点) | 循环切换附点 |
| Ctrl+S | 保存到服务器 |
| Esc | 退出编辑模式 |

## 保存到服务器

编辑完成后点击 **Save** 按钮，NoteEditor 会将当前谱面通过 `Gp7Exporter` 导出为 Guitar Pro 7 (`.gp`) 格式，并通过 API 上传替换服务器上的原文件。保存成功后自动重新加载谱面。

## 实现细节

### 技术栈
- **乐谱引擎**: [alphaTab](https://www.alphatab.net/) v1.8.0
- **导出格式**: Guitar Pro 7 (`.gp`) via `alphaTab.exporter.Gp7Exporter`
- **渲染更新**: `api.render()` 保持视口不变重新渲染

### 核心组件

`frontend/src/components/NoteEditor.vue` — 核心编辑组件，封装了所有编辑逻辑和 UI 面板。

### Bug 修复

| 问题 | 修复方案 |
|------|----------|
| 改音符跳到第一小节 | `renderScore()` 改为 `render()`，避免全布局重建 |
| 点击另一个音符仍选中第一个 | 用 `renderFinished` 事件配合高计数器跳过渲染期间所有误触事件 |
| 弦数越界崩溃 | `setString()` 添加 `stringNum < 1 \|\| stringNum > this.numStrings` 校验 |
| 保存 404 | 添加 `baseURL` 前缀，修复开发模式下请求发到 Vite 而非后端的问题 |
| `Gp7Exporter` 报错 | 从 `alphaTab.Gp7Exporter` 改为 `alphaTab.exporter.Gp7Exporter` |
| 改弦颜色不变 | `setString()` 中调用 `_updateNoteStringColor()` 同步更新 `note.style.colors` |
| 多音轨弦数错误 | `selectNote()` 从点击的 `staff` 动态读取 `stringTuning` |
