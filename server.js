const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 代理接口
app.get('/api/lottery/zqspf', async (req, res) => {
  try {
    const targetUrl = 'https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry';
    
    const response = await axios.get(targetUrl, {
      params: {
        channel: 'c',
        _: Date.now()
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://m.sporttery.cn/',
        'Accept': 'application/json',
        'Origin': 'https://m.sporttery.cn'
      },
      timeout: 10000
    });

    console.log('✅ 成功获取竞彩数据');
    res.json(response.data);
  } catch (error) {
    console.error('❌ 代理请求失败:', error.message);
    res.json({
      success: false,
      errorMessage: '代理请求失败',
      value: null
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ 代理服务器已启动: http://localhost:${PORT}`);
  console.log(`📊 访问 http://localhost:${PORT} 查看实时赔率`);
});