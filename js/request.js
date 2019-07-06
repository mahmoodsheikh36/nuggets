const http = require('http'),
      https = require('https'),
      url = require('url')

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
  }))
}

/*
  @url      - url returned from above 'buildUrl' function
  @onResult - callback function to handle the content returned from request
  @method   - http request method, eg. 'GET', 'POST'
 */
let request = (options, onResult, method='GET') => {
  const url = buildUrl(options)
  const port = url.port === '443' ? https : http

  let content = ''

  let requestOptions = {
    host: url.hostname,
    path: url.path,
    method: method,
    headers: {
      'X-User-Agent': 'TemporaryUserAgent',
    },
  }

  const req = port.request(requestOptions, (res) => {
    res.setEncoding('utf8')

    res.on('data', (chunk) => {
      content += chunk
    })

    res.on('end', () => {
      onResult(content, res.statusCode)
    })
  })

  req.on('error', (err) => {
    // res.send('error: ' + err.message)
  })

  req.end()
}

let get = (url, cb) => {
  https.get(url, (res) => {
    let data = '';

    // A chunk of data has been recieved.
    res.on('data', (chunk) => {
      data += chunk;
    });

    // The whole response has been received. Print out the result.
    res.on('end', () => {
      cb(data, res.statusCode)
    });

  }).on("error", (err) => {
    console.log("error making get request: " + err.message);
  })
}

let getBuffer = (url, cb) => {
  https.get(url, (res) => {
    let data = [], dataLen = 0

    res.on('data', (chunk) => {
      data.push(chunk)
      dataLen += chunk.length
    })

    res.on('end', () => {
      let buf = Buffer.alloc(dataLen)

      for (let i = 0, len = data.length, pos = 0; i < len; ++i) {
        data[i].copy(buf, pos)
        pos += data[i].length
      }

      cb(buf)
    })
  })
}

module.exports = {
  request,
  get,
  getBuffer,
  buildUrl, /* for debugging */
}
