const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ========== 存储结构 ==========
let oddsHistory = new Map();

// ========== 接收前端发来的赔率数据，自动对比并存储 ==========
app.post('/api/save', (req, res) => {
  try {
    const { matches } = req.body;
    if (!matches || !Array.isArray(matches)) {
      return res.json({ success: false, message: '数据格式错误' });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
    const dateStr = now.toLocaleDateString('zh-CN');
    const fullTime = dateStr + ' ' + timeStr;

    const pools = ['had', 'hhad', 'crs', 'ttg', 'hafu'];
    let totalChanges = 0;

    matches.forEach(match => {
      const matchId = String(match.id);
      
      if (!oddsHistory.has(matchId)) {
        oddsHistory.set(matchId, { _info: null, had: [], hhad: [], crs: [], ttg: [], hafu: [] });
      }
      
      const history = oddsHistory.get(matchId);

      // 保存比赛信息
      history._info = {
        home: match.home || '',
        away: match.away || '',
        homeRank: match.homeRank || '',
        awayRank: match.awayRank || '',
        time: match.time || '',
        matchNum: match.matchNum || '',
        league: match.league || '',
        leagueAllName: match.leagueAllName || '',
        leagueCode: match.leagueCode || '',
        hhadGoalLine: match.hhadGoalLine || '',
        hhadGoalLineValue: match.hhadGoalLineValue || ''
      };

      // 保存每个玩法的赔率
      pools.forEach(pool => {
        if (!match.odds || !match.odds[pool]) return;
        const oddsData = { ...match.odds[pool] };
        oddsData._time = fullTime;
        oddsData._timestamp = now.getTime();

        // 检查是否与上一次相同
        const poolHistory = history[pool];
        if (poolHistory.length > 0) {
          const last = poolHistory[0];
          let same = true;
          Object.keys(oddsData).forEach(k => {
            if (k !== '_time' && k !== '_timestamp' && oddsData[k] !== last[k]) {
              same = false;
            }
          });
          if (same) return;
        }

        poolHistory.unshift(oddsData);
        totalChanges++;
      });
    });

    console.log(`📝 已保存，${totalChanges} 项变化`);
    res.json({ success: true, totalChanges, history: getFullHistory() });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ========== 获取完整历史 ==========
app.get('/api/history', (req, res) => {
  res.json({ success: true, history: getFullHistory() });
});

// ========== 重置 ==========
app.post('/api/reset', (req, res) => {
  oddsHistory.clear();
  res.json({ success: true });
});

function getFullHistory() {
  const summary = [];
  oddsHistory.forEach((data, matchId) => {
    summary.push({
      matchId,
      info: data._info || {},
      had: data.had || [],
      hhad: data.hhad || [],
      crs: data.crs || [],
      ttg: data.ttg || [],
      hafu: data.hafu || []
    });
  });
  return summary;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器已启动: http://localhost:${PORT}`);
});
