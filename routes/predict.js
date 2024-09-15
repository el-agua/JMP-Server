require('dotenv').config();

var express = require('express');
var router = express.Router();
const axios = require('axios');

const MODEL_ID = "8w6yyp2q";
const BASETEN_API_KEY = process.env.BASETEN_API_KEY;

router.post('/', async function (req, res, next) {
  try {
    const locations = req.body.locations;  // Expecting an array of locations in the body

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).send("Please provide an array of locations.");
    }

    // Store the results for all locations
    const riddleResults = [];

    // Loop through each location and make a request
    for (const location of locations) {
      const messages = [
        {
          "role": "system",
          "content": "You are a trivia expert. Provide a riddle about a location that will lead someone to and help them identify the location, and do not mention/reveal the location's name."
        },
        {
          "role": "user",
          "content": `Give me a riddle about this location: ${location}.`
        }
      ];

      const payload = {
        messages: messages,
        stream: false,
        max_tokens: 2048,
        temperature: 0.8
      };

      try {
        // Make request to the Baseten model for each location
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

        if (response.data) {
          // Clean up the riddles by removing newlines and trimming spaces
          const cleanedRiddles = response.data.replace(/\n/g, ' ').trim();

          // Collect response for this location
          riddleResults.push({
            location: location,
            riddle: cleanedRiddles
          });
        } else {
          // Handle case where the expected structure is missing
          console.error(`Unexpected response format for ${location}:`, response);
          riddleResults.push({
            location: location,
            error: "Unexpected response format, no riddles generated."
          });
        }

      } catch (err) {
        console.error(`Error with Baseten request for ${location}:`, err.message);
        riddleResults.push({
          location: location,
          error: "Failed to generate riddles"
        });
      }
    }

    // Send all results back to the client
    res.json(riddleResults);

  } catch (error) {
    console.error('Error connecting to Baseten:', error.message);
    res.status(500).send('Error processing request');
  }
});

module.exports = router;
