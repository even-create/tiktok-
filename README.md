# TikTok 账号追踪 Dashboard

TikTok Studio 风格的账号与视频数据追踪后台，支持通过 [TikHub API](https://docs.tikhub.io/) 同步公开账号数据，并保存到 Supabase。

## 功能

- 添加 TikTok 账号链接并自动同步视频数据
- 删除已追踪账号（级联删除相关视频）
- 视频播放按钮跳转到 TikTok 原视频
- 单条视频互动率：`(点赞 + 评论 + 分享) / 播放量`
- 数据卡片、折线图、视频排行榜
- 白色主题 + TikTok 深色渐变点缀

## 本地开发

1. 复制环境变量：

```bash
cp .env.example .env.local
```

2. 在 Supabase SQL Editor 执行 `supabase/migrations/` 下的 SQL 文件。

3. 安装依赖并启动：

```bash
npm install
npm run dev
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `TIKHUB_API_KEY` | TikHub API Key（TikTok 数据同步） |
| `GEMINI_API_KEY` | Gemini API Key（AI Insights） |
| `CRON_SECRET` | Vercel Cron 鉴权（`/api/cron/sync`） |
| `SYNC_CACHE_MINUTES` | 同步缓存窗口（分钟，默认 360） |

## 技术栈

- Next.js 16
- React 19
- Tailwind CSS 4
- Supabase
- TikHub TikTok App API
