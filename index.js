require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

app.post('/api/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) return res.status(200).send('No events');

    for (const event of events) {
      if (event.type !== 'message' || event.message.type !== 'text') continue;

      const replyToken = event.replyToken;
      const userMessage = event.message.text;

      // ✅ OpenAIにリクエスト
      const chatRes = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }]
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      // ✅ OpenAIからの返信を取り出す
      const replyText = chatRes?.data?.choices?.[0]?.message?.content;

      if (!replyText) {
        console.error("⚠️ OpenAI応答が空 or 不正です。chatRes:", JSON.stringify(chatRes.data));
        return res.status(500).send("OpenAI応答エラー");
      }

      console.log("🟩返信内容:", replyText);

      // ✅ LINEに返信を送信
      await axios.post('https://api.line.me/v2/bot/message/reply', {
        replyToken,
        messages: [{ type: 'text', text: replyText }]
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    res.status(500).send('Error');
  }
});

module.exports = app;
