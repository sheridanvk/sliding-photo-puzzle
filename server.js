// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
const port =  process.env.port || 3000;
// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// set up a route to redirect http to https
app.enable('trust proxy');
app.use(function(request, response, next) {  
  if(!request.secure) {
    var secureUrl = "https://" + request.headers['host'] + request.url; 
    response.writeHead(301, { "Location":  secureUrl });
    response.end();
  }
  next();
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function(request, response) {
  response.sendFile(__dirname + "/public/views/index.html");
});

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// listen for requests :)
var listener = app.listen(port, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});