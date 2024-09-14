var express = require('express');
var router = express.Router();
const axios = require('axios');

const MODEL_ID = "8w6yyp2q";
const BASETEN_API_KEY = 'YMKFudUr.FcjOTi13DlaR3ZtCbBIumoXeqFJy25yx';

router.post('/', async function (req, res, next) {
    try {
    const location = req.body.location;  // Expecting client to send location in the body

    const messages = [
      { "role": "system", "content": "You are a trivia expert. Provide broader and then more specific riddles about a location that will lead someone to and help them identify the location, and do not mention/reveal the location's name." },
      { "role": "user", "content": `Give me 3 riddles about this location: ${location}.` }
    ];

      const payload = {
        messages: messages,
        stream: false,
        max_tokens: 2048,
        temperature: 0.8
      };

      // Make request to the Baseten model
      const response = await axios.post(
        `https://model-${MODEL_ID}.api.baseten.co/production/predict`,
        payload,
        {
          headers: {
            'Authorization': `Api-Key ${BASETEN_API_KEY}`,
            'Content-Type': 'application/json'
          },
        }
    );

    // Send response from model back to client
    res.json(response.data);
} catch (error) {
  console.error('Error connecting to Baseten:', error.message);
  res.status(500).send('Error processing request');
}
});

module.exports = router;