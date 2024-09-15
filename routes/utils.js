require("dotenv").config();
const axios = require("axios");

const MODEL_ID = "8w6yyp2q";
const BASETEN_API_KEY = process.env.BASETEN_API_KEY;

const processData = async (data, n) => {
  let choices = data.choices[0].message.content.split(";");
  choices = choices.map((choice) => choice.trim());
  choices = choices.map((choice) => {
    const [key, address] = choice.split(":");
    return { _id: key, address };
  });
  addy = choices.map((choice) => choice.address);
  addy = addy.map((addy) => {
    return { type: ["address"], q: addy, limit: 1 };
  });
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(addy),
  };
  const obj = await fetch(
    `https://api.mapbox.com/search/geocode/v6/batch?access_token=${process.env.MAPBOX_KEY}`,
    options
  );
  const resp = await obj.json();
  const locations = choices.map((choice) => choice._id);
  const riddles = await generateRiddles(locations);
  const q = {};
  for (let i = 0; i < choices.length; i++) {
    q[choices[i]._id] = {
      ...choices[i],
      lat: resp.batch[i].features[0].properties.coordinates.latitude,
      long: resp.batch[i].features[0].properties.coordinates.longitude,
      clueType: "text",
      clueText: riddles[i],
    };
  }
  choices.sort(() => 0.5 - Math.random());

  return q;
};

const generateLocations = (lat, lon, city, number) => {
  if (!lat || !lon || !city || !number) {
    res.status(500).send("Please provide a latitude, longitude, and city");
    return;
  }

  const query = {
    model: "llama-3.1-sonar-large-128k-online",
    messages: [
      {
        role: "system",
        content: "Be precise and concise.",
      },
      {
        role: "user",
        content: `Give me a list of ${String(
          number * 4 + 1
        )} unique landmarks close to the coordinate location (${lat}, ${lon}), ${city} in the form {LANDMARK_NAME}:{LANDMARK_MAILING_ADDRESS},{LANDMARK_CITY},{LANDMARK_STATE} separated by a ; delimeter. Please omit any commentary or details before the list. The answer should contain solely the list with no formatting or newline characters.`,
      },
    ],
    temperature: 0.2,
    top_p: 0.9,
    return_citations: true,
    search_domain_filter: ["perplexity.ai"],
    return_images: false,
    return_related_questions: false,
    search_recency_filter: "month",
    top_k: 0,
    stream: false,
    presence_penalty: 0,
    frequency_penalty: 1,
  };
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  };
  return fetch("https://api.perplexity.ai/chat/completions", options)
    .then((response) => response.json())
    .then((data) => processData(data, number).then((choices) => choices))
    .catch((err) => res.status(500).send(err));
};

const generateRiddles = async (locations) => {
  try {
    if (!Array.isArray(locations) || locations.length === 0) {
      return null;
    }

    // Store the results for all locations
    const riddleResults = [];

    // Loop through each location and make a request
    for (const location of locations) {
      const messages = [
        {
          role: "system",
          content:
            "You are a trivia expert. Provide a riddle about a location that will lead someone to and help them identify the location, and do not mention/reveal the location's name.",
        },
        {
          role: "user",
          content: `Give me a riddle about this location: ${location}. The response should contain solely the riddle text. Omit any other information or response.`,
        },
      ];

      const payload = {
        messages: messages,
        stream: false,
        max_tokens: 2048,
        temperature: 0.8,
      };

      try {
        // Make request to the Baseten model for each location
        const response = await axios.post(
          `https://model-${MODEL_ID}.api.baseten.co/production/predict`,
          payload,
          {
            headers: {
              Authorization: `Api-Key ${BASETEN_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data) {
          // Clean up the riddles by removing newlines and trimming spaces
          const cleanedRiddles = response.data.replace(/\n/g, " ").trim();

          // Collect response for this location
          riddleResults.push({
            location: location,
            riddle: cleanedRiddles,
          });
        } else {
          // Handle case where the expected structure is missing
          console.error(
            `Unexpected response format for ${location}:`,
            response
          );
          riddleResults.push({
            location: location,
            error: "Unexpected response format, no riddles generated.",
          });
        }
      } catch (err) {
        console.error(
          `Error with Baseten request for ${location}:`,
          err.message
        );
        riddleResults.push({
          location: location,
          error: "Failed to generate riddles",
        });
      }
    }
    return riddleResults;
  } catch (err) {}
};

module.exports = { generateLocations, generateRiddles };
