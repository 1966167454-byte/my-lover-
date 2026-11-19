# 河南科技大学信息工程学院秋季摄影照片征集投票

## 本地运行

```bash
node server.js
```

然后浏览器打开 http://localhost:3000

## 投票数据

- 票数保存在 `votes.json`，每个浏览器会生成一个匿名 `voterId`，服务端保证「一人最多 3 票、投完不可改」。
- 直接双击 `index.html`（file:// 方式）也能看，但票数只在本机浏览器生效；正式使用请通过服务器地址访问。

## 部署到 Render（免费，推荐）

1. 把整个 `秋季摄影征集投票` 文件夹上传到 GitHub 仓库。
2. 在 render.com 新建 Web Service，连接该仓库。
3. Build Command 留空，Start Command 填 `node server.js`。
4. 部署完成后会得到一个 `https://xxx.onrender.com` 公网链接。

注意：Render 免费版的磁盘是临时的，重新部署或重启后 `votes.json` 可能被清空。正式比赛建议：
- 升级到带持久化磁盘的方案；或
- 把票数改存到数据库（如 Firebase / Supabase / MongoDB Atlas 免费档）。

## 其他平台

项目已包含 `package.json` 和 `Dockerfile`，可直接部署到 Railway、Fly.io、Glitch 等支持 Node 的平台。
