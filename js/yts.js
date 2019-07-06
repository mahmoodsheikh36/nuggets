const request = require('./request.js')


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

  request.request(options, onResult)
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

  request.request(options, onResult)
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
