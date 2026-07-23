# B站视频源集成 (Bilibili Video Source)

为 It's MyTabs 添加 Bilibili 视频播放支持，与 YouTube 并列作为可选音源。

## 工作原理

```
用户粘贴 B站链接/BV号
        ↓
后端 yt-dlp 下载 mp4 → 存到 data/tabs/{id}/bilibili-{bvid}.mp4
        ↓
config.json 记录: { bilibili: [{bvid, syncMethod, simpleSync, advancedSync}] }
        ↓
前端 <video> 元素播放本地 mp4 → bilibiliHandler 桥接 alphaTab
        ↓
alphaTab 同步：MIDI + 视频同步滚动
```

## 架构对比

| | YouTube | Bilibili |
|---|---|---|
| 播放方式 | YT IFrame API | 本地 `<video>` 元素 |
| 视频存储 | 云端，无本地文件 | yt-dlp 下载本地 mp4 |
| 同步轮询 | `setInterval(100ms)` | `setInterval(100ms)`（同样方案） |
| Handler | `alphaTabYoutubeHandler` | `alphaTabBilibiliHandler` |
| 离线可用 | ❌ | ✅ |

## 后端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/tab/:id/bilibili` | 添加B站视频（触发 yt-dlp 下载） |
| POST | `/api/tab/:id/bilibili/:bvid` | 保存同步配置 |
| DELETE | `/api/tab/:id/bilibili/:bvid` | 删除视频及文件 |
| GET | `/api/tab/:id/bilibili/:bvid/video` | 流式播放（支持 Range 请求） |

## 合集/分P 支持

- 输入 `BVxxx` → 下载第一个视频（`--no-playlist`）
- 输入 `BVxxx?p=3` 或带 `p=3` 的 URL → 下载第3个视频（`--playlist-items 3`）
- 文件名区分：`bilibili-BVxxx.mp4` vs `bilibili-BVxxx-p3.mp4`
- config.json 的 bvid 字段也会带上 `-p3` 后缀

## yt-dlp 下载参数

```bash
yt-dlp "https://www.bilibili.com/video/BVxxx" \
  -f "bestvideo[height<=480]+bestaudio/best[height<=480]" \
  --merge-output-format mp4 \
  --add-header "Referer:https://www.bilibili.com/" \
  --add-header "Origin:https://www.bilibili.com" \
  --no-playlist
```

- 最高 480p（免费画质上限）
- 绕过 B站 412 防盗链

## 修改的文件

### 后端
| 文件 | 改动 |
|------|------|
| `backend/zod.ts` | 添加 `BilibiliSchema`、`BilibiliAddDataSchema`，`ConfigJSONSchema` 加 `bilibili` 字段 |
| `backend/tab.ts` | 添加 `addBilibili`/`updateBilibili`/`removeBilibili`/`getBilibiliFilePath` |
| `backend/main.ts` | 4个 API 路由 + yt-dlp 下载逻辑 + Range 请求支持（206 Partial Content） |

### 前端
| 文件 | 改动 |
|------|------|
| `frontend/src/pages/Tab.vue` | `initBilibili()`、`saveBilibili()`、`audioBilibili()`、`bilibiliHandler` 桥接 + 视频元素 |
| `frontend/src/pages/TabConfig.vue` | B站 URL 输入框 + 增删改查方法 |

## 踩过的坑

1. **事件监听器泄漏**：最初用 `timeupdate` 事件 + 内联函数，每次切音源重复叠加。改为 `setInterval` 轮询（跟 YouTube 一样），用 `this._bilibiliInterval` 存储引用便于清理。

2. **Range 请求未实现**：`<video>` 元素需要 HTTP Range 支持才能流畅 seek。最初只设了 `Accept-Ranges: bytes` 头但没实现实际的分片读取。修复后解析 `Range` 头，返回 206 Partial Content。

3. **timeupdate 不稳定**：浏览器 `timeupdate` 事件触发频率不固定（有时一帧内多次），跟 alphaTab 的 canvas 渲染抢主线程导致谱面卡顿。改用 `setInterval(100ms)` 轮询解决。

4. **yt-dlp 安装**：PEP 668 限制，需 `pip install --break-system-packages yt-dlp`，装在 `~/.hermes/profiles/personal/home/.local/bin/`，后端启动时需确保该路径在 PATH 中。
