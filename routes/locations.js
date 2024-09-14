var express = require("express");
var router = express.Router();
require("dotenv").config();

const processData = async (data, n) => {
  let choices = data.choices[0].message.content.split(";");
  choices = choices.map((choice) => choice.trim());
  choices = choices.map((choice) => {
    const [name, address] = choice.split(":");
    return { name, address };
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
  for (let i = 0; i < choices.length; i++) {
    choices[i].coordinates = {
      latitude: resp.batch[i].features[0].properties.coordinates.latitude,
      longitude: resp.batch[i].features[0].properties.coordinates.longitude,
    };
  }
  choices.sort(() => 0.5 - Math.random());
  let q = [];
  q.push(choices[0]);
  for (let i = 0; i < n; i++) {
    q.push(choices.slice(4 * i + 1, 4 * i + 5));
  }
  return q;
};

/* GET locations listing. */
router.get("/", function (req, res, next) {
  console.log(process.env.PERPLEXITY_KEY);

  if (
    !req.query["latitude"] ||
    !req.query["longitude"] ||
    !req.query["city"] ||
    !req.query["number"]
  ) {
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
          req.query["number"] * 4 + 1
        )} unique landmarks close to the coordinate location (${
          req.query["latitude"]
        }, ${req.query["longitude"]}), ${
          req.query["city"]
        } in the form {LANDMARK_NAME}:{LANDMARK_MAILING_ADDRESS},{LANDMARK_CITY},{LANDMARK_STATE} separated by a ; delimeter. Please omit any commentary or details before the list. The answer should contain solely the list with no formatting or newline characters.`,
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
  fetch("https://api.perplexity.ai/chat/completions", options)
    .then((response) => response.json())
    .then((data) =>
      processData(data, req.query["number"]).then((choices) =>
        res.send({ end: choices[0], path: choices.slice(1) })
      )
    )
    .catch((err) => res.send(err));
});

module.exports = router;
