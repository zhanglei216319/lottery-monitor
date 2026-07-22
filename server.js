const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

let oddsHistory = new Map();
let currentDate = new Date().toLocaleDateString('zh-CN');

function checkAndClearDaily() {
  const now = new Date();
  const today = now.toLocaleDateString('zh-CN');
  if (today !== currentDate) {
    const hour = now.getHours();
    if (hour >= 0 && hour <= 1) {
      console.log('🕛 凌晨' + hour + '点，自动清除前一天数据...');
      oddsHistory.clear();
      currentDate = today;
      console.log('✅ 历史数据已自动清除');
    } else {
      currentDate = today;
    }
  }
}
setInterval(checkAndClearDaily, 5 * 60 * 1000);

app.get('/api/matchlist', async (req, res) => {
  try {
    const response = await axios.get(
      'https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry',
      {
        params: { channel: 'c' },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.sporttery.cn/',
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );
    if (response.data && response.data.success) {
      const matchList = response.data.value.matchInfoList;
      let allMatches = [];
      if (matchList && Array.isArray(matchList)) {
        for (let i = 0; i < matchList.length; i++) {
          if (matchList[i].subMatchList) {
            allMatches = allMatches.concat(matchList[i].subMatchList);
          }
        }
      }
      res.json({ success: true, count: allMatches.length, rawList: allMatches });
    } else {
      throw new Error('API返回失败');
    }
  } catch (error) {
    console.error('获取列表失败:', error.message);
    res.json({ success: false, message: error.message, rawList: [] });
  }
});

app.get('/api/match/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const response = await axios.get(
      'https://webapi.sporttery.cn/gateway/uniform/football/getFixedBonusV1.qry',
      {
        params: { clientCode: '3001', matchId: matchId },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.sporttery.cn/',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.json({ success: false, message: error.message, data: null });
  }
});

app.post('/api/save', (req, res) => {
  try {
    const { matches } = req.body;
    if (!matches || !Array.isArray(matches)) {
      return res.json({ success: false, message: '数据格式错误', history: [] });
    }
    checkAndClearDaily();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
    const dateStr = now.toLocaleDateString('zh-CN');
    const fullTime = dateStr + ' ' + timeStr;
    const pools = ['had', 'hhad', 'crs', 'ttg', 'hafu'];
    let totalChanges = 0;
    matches.forEach(function(match) {
      const matchId = String(match.id);
      if (!oddsHistory.has(matchId)) {
        oddsHistory.set(matchId, { _info: null, had: [], hhad: [], crs: [], ttg: [], hafu: [] });
      }
      const history = oddsHistory.get(matchId);
      history._info = {
        home: match.home || '', away: match.away || '',
        homeRank: match.homeRank || '', awayRank: match.awayRank || '',
        time: match.time || '', matchNum: match.matchNum || '',
        league: match.league || '', leagueAllName: match.leagueAllName || '',
        leagueCode: match.leagueCode || '', matchDate: match.matchDate || '',
        hhadGoalLine: match.hhadGoalLine || '', hhadGoalLineValue: match.hhadGoalLineValue || ''
      };
      pools.forEach(function(pool) {
        if (!match.odds || !match.odds[pool]) return;
        const oddsData = {};
        var oddsObj = match.odds[pool];
        Object.keys(oddsObj).forEach(function(k) { oddsData[k] = oddsObj[k]; });
        oddsData._time = fullTime;
        oddsData._timestamp = now.getTime();
        const poolHistory = history[pool];
        if (poolHistory.length > 0) {
          const last = poolHistory[0];
          var same = true;
          Object.keys(oddsData).forEach(function(k) {
            if (k !== '_time' && k !== '_timestamp' && oddsData[k] !== last[k]) same = false;
          });
          if (same) return;
        }
        poolHistory.unshift(oddsData);
        totalChanges++;
      });
    });
    console.log('📝 已保存，' + totalChanges + ' 项变化');
    res.json({ success: true, totalChanges: totalChanges, history: getFullHistory() });
  } catch (e) {
    res.json({ success: false, message: e.message, history: [] });
  }
});

app.get('/api/history', function(req, res) {
  res.json({ success: true, history: getFullHistory() });
});

function getFullHistory() {
  const summary = [];
  oddsHistory.forEach(function(data, matchId) {
    summary.push({
      matchId: matchId,
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

app.listen(PORT, '0.0.0.0', function() {
  console.log('✅ 服务器已启动: http://localhost:' + PORT);
  console.log('🕛 每日凌晨0-1点自动清除前一天数据');
});
