const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 存储快照
let previousSnapshot = null;

app.post('/api/compare', (req, res) => {
  try {
    const currentData = req.body;
    if (!currentData || !Array.isArray(currentData)) {
      return res.json({ success: false });
    }
    previousSnapshot = JSON.parse(JSON.stringify(currentData));
    console.log('快照已更新，比赛数:', currentData.length);
    res.json({ success: true, isFirstTime: false });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ matchCount: previousSnapshot ? previousSnapshot.length : 0 });
});

// 捕获所有其他请求返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 关键：必须监听 0.0.0.0，使用 Railway 分配的端口
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port ' + PORT);
});

// 捕获未处理的错误，防止崩溃
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
