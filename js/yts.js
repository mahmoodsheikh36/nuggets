const http = require('http')
const https = require('https')
const url = require('url')


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
let request = (url, onResult, method='GET') => {
  const port = url.port === '443' ? https : http

  let content = ''

  const req = port.request({
    host:     url.hostname,
    path:     url.path,
    method:   method,
  }, (res) => {
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


/*
 * backend           - https://yts.lt/api/v2/list_movies.json
 * @ytsResStatusCode - status code returned from yts web API from above backend
 * @ytsResContent    - the content returned from yts web API from above backend
 */
let fetchMoviesCB = (ytsResContent, ytsResStatusCode) => {
  if (ytsResStatusCode == 200) {
    let jsonRes = JSON.parse(ytsResContent)
    let movies = jsonRes.data
    console.log(JSON.stringify(movies, null, 2))
  } else {
    console.log(`couldnt fetch movie list, status code ${ytsResStatusCode}`)
  }
}


/*
 * all the fields in the second argument to this function are
 * documented in the following link in the 'List Movies' section
 * https://yts.lt/api
 * @onResult - the callback function to handle the returned json,
 *             it defaults to 'fetchMoviesCB' which prints the output
 */
let fetchMovies = (onResult=fetchMoviesCB,
                  {limit, page, quality, minumum_rating,
                   query_term, genre, sort_by,
                   order_by, with_rt_ratings}={}) => {
  const LIST_MOVIES_BACKEND = '/api/v2/list_movies.json'
  const options = {
    host: 'yts.lt',
    path: LIST_MOVIES_BACKEND,
    port: 443,
    query: {
      limit:           limit,
      page:            page,
      quality:         quality,
      query_term:      query_term,
      genre:           genre,
      sort_by:         sort_by,
      order_by:        order_by,
      minimum_rating:  limit,
      with_rt_ratings: with_rt_ratings,
    }
  }
  let url = buildUrl(options)

  request(url, onResult)
}


/*
 * get information about a movie
 * @onResult - callback function to handle response
 * the other arguments are documented here https://yts.lt/api
 */
let fetchMovieDetails = (onResult, {movie_id, with_images, with_cast}={}) => {
  const MOVIE_DETAILS_BACKEND = '/api/v2/movie_details.json'
  const options = {
    host: 'yts.lt',
    path: MOVIE_DETAILS_BACKEND,
    port: 443,
    query: {
      movie_id:    movie_id,
      with_images: with_images,
      with_cast:   with_cast
    }
  }
  let url = buildUrl(options)

  request(url, onResult)
}

module.exports = {
  fetchMovies,
  fetchMovieDetails,
}
/*
fetchMovieDetails((content, statusCode) => {
  console.log(content)
}, {movie_id: 7025, with_images: true, with_cast: true})
*/