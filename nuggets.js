const http = require('http');
const https = require('https');
const url = require('url');


/*
  @options - options to set the url to, eg. hostname, port
*/
let buildUrl = (options) => {
  return url.parse(url.format({
    protocol: options.port == 443 ? 'https' : 'http',
    hostname: options.host,
    pathname: options.path,
    query: options.query,
    port: options.port,
  }));
}


/*
  @url      - url returned from above 'buildUrl' function
  @onResult - callback function to handle the content returned from request
  @method   - http request method, eg. 'GET', 'POST'
*/
let request = (url, onResult, method='GET') => {
  const port = url.port === '443' ? https : http;

  let content = '';

  const req = port.request({
    host:     url.hostname,
    path:     url.path,
    method:   method,
  }, (res) => {
    res.setEncoding('utf8');

    res.on('data', (chunk) => {
      content += chunk;
    });

    res.on('end', () => {
      onResult(res.statusCode, content);
      console.log(url);
    });
  });

  req.on('error', (err) => {
    // res.send('error: ' + err.message);
  });

  req.end();
};


/*
  backend           - https://yts.lt/api/v2/list_movies.json
  @ytsResStatusCode - status code returned from yts web API from above backend
  @ytsResContent    - the content returned from yts web API from above backend
*/
let listMovies = (ytsResStatusCode, ytsResContent) => {
  if (ytsResStatusCode == 200) {
    let jsonRes = JSON.parse(ytsResContent);
    let movies = jsonRes.data;
    console.log(JSON.stringify(movies, null, 2));
  } else {
    console.log(`couldnt fetch movie list, status code ${ytsResStatusCode}`);
  }
}


let main = () => {
  let LIST_MOVIES_BACKEND = '/api/v2/list_movies.json';
  let options = {
    host: 'yts.lt',
    path: LIST_MOVIES_BACKEND,
    method: 'GET',
    query: {
      limit: 50
    },
    port: 443
  };
  let url = buildUrl(options);
  request(url, listMovies);
  /*
    let jsonResponse = JSON.parse(response);
    console.log(JSON.stringify(jsonResponse, null, 2));
  */
}

main();
