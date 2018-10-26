module.exports = {
  "globDirectory": "/app/public",
  "globPatterns": [
    "manifest.json",
    "js/*.{js,css,html,json}",
    "css/*.{js,css,html,json}",
    "views/*.{js,css,html,json}"
  ],
  "swDest": "public/sw.js",
  "swSrc": "service-worker.js"
};