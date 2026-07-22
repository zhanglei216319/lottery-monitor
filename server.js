const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 存储上一时间点的赔率快照
let previousSnapshot = null;
let lastUpdateTime = null;

// 接收前端发来的当前赔率，返回差额
app.post('/api/compare', (req, res) => {
  try {
    const currentData = req.body;
    
    if (!currentData || !Array.isArray(currentData)) {
      return res.json({ success: false, message: '数据格式错误' });
    }

    const now = new Date().toISOString();
    let diffs = [];

    if (previousSnapshot) {
      // 计算差额
      const prevMap = new Map(previousSnapshot.map(m => [m.id, m]));

      currentData.forEach(match => {
        const prev = prevMap.get(match.id);
        if (!prev) {
          diffs.push({ id: match.id, changed: false, message: '新比赛' });
          return;
        }

        const matchDiffs = {};
        let hasChange = false;

        Object.keys(match.odds).forEach(pool => {
          if (!match.odds[pool] || !prev.odds[pool]) return;
          
          const poolDiffs = {};
          Object.keys(match.odds[pool]).forEach(key => {
            if (key === 'ut') return;
            const newVal = match.odds[pool][key];
            const oldVal = prev.odds[pool][key];
            if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
              poolDiffs[key] = {
                old: oldVal,
                new: newVal,
                diff: +(newVal - oldVal).toFixed(2)
              };
              hasChange = true;
            }
          });

          if (Object.keys(poolDiffs).length > 0) {
            matchDiffs[pool] = poolDiffs;
          }
        });

        diffs.push({
          id: match.id,
          changed: hasChange,
          diffs: matchDiffs
        });
      });

      // 检查是否有比赛被移除
      const currentIds = new Set(currentData.map(m => m.id));
      previousSnapshot.forEach(m => {
        if (!currentIds.has(m.id)) {
          diffs.push({ id: m.id, changed: true, removed: true });
        }
      });
    }

    // 更新快照
    previousSnapshot = JSON.parse(JSON.stringify(currentData));
    lastUpdateTime = now;

    console.log(`✅ 快照已更新 (${currentData.length}场比赛)`);

    res.json({
      success: true,
      time: now,
      isFirstTime: !previousSnapshot,
      diffs: diffs
    });

  } catch (error) {
    console.error('处理失败:', error);
    res.json({ success: false, message: error.message });
  }
});

// 获取上次更新时间
app.get('/api/status', (req, res) => {
  res.json({
    lastUpdateTime,
    matchCount: previousSnapshot ? previousSnapshot.length : 0
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器已启动: http://localhost:${PORT}`);
});
