const request = require('./request.js')

const POPCORNTIME_HOST = 'tv-v2.api-fetch.website'

let fetchMovies = (cb, {page, sort, order, genre, keywords}={}) => {
  if (page === undefined)
    page = 1

  let options = {
    host: POPCORNTIME_HOST,
    path: `/movies/${page}`,
    port: 443,
    query: {
      sort:     sort,
      order:    order,
      genre:    genre,
      keywords: keywords
    }
  }

  request.request(options, (response, statusCode) => {
    if (statusCode === 200) {
      let movies = JSON.parse(response)
      cb(undefined, movies)
    } else {
      cb(new Error(`failed to fetch popcorntime movies, status code ${statusCode}`), undefined)
    }
  })
}

module.exports = {
  fetchMovies,
}
