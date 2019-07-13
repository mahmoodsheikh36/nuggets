
class Movie {
  constructor() {
  }
}

let fromYtsMovie = (ytsMovie) => {
  let movie = new Movie()

  movie.imdbId     = ytsMovie.imdb_code
  movie.title      = ytsMovie.title
  movie.year       = ytsMovie.year
  movie.genres     = ytsMovie.genres
  movie.trailer    = 'https://www.youtube.com/embed/' + ytsMovie.yt_trailer_code
  movie.coverImage = ytsMovie.large_cover_image
  movie.runtime    = ytsMovie.runtime
  movie.cert       = ytsMovie.mpa_rating
  movie.desc       = ytsMovie.description_full
  movie.srcObj     = ytsMovie

  let foundTorrent = false
  for (let i = 0; i < ytsMovie.torrents.length; ++i) {
    let torrent = ytsMovie.torrents[i]
    if (torrent.quality === '1080p') {
      movie.torrent1080p = torrent
      foundTorrent = true
    }
  }
  if (!foundTorrent)
    console.error(`1080p torrent not found for \'${movie.title}\'`)

  return movie
}

let fromPopcornMovie = (popcornMovie) => {
  let movie = new Movie()

  movie.imdbId       = popcornMovie.imdb_id
  movie.title        = popcornMovie.title
  movie.year         = popcornMovie.year
  movie.genres       = popcornMovie.genres
  movie.coverImage   = popcornMovie.images.poster
  movie.runtime      = popcornMovie.runtime
  movie.cert         = popcornMovie.certification
  movie.desc         = popcornMovie.synopsis
  movie.torrent1080p = popcornMovie.torrents.en['1080p']
  movie.srcObj       = popcornMovie

  // last 11 characters of the url are the code for the yt video
  if (popcornMovie.trailer) {
    let trailerCode = popcornMovie.trailer.substring(popcornMovie.trailer.length - 11)
    movie.trailer      = 'https://www.youtube.com/embed/' + trailerCode
  } else {
    console.error(`${movie.title} doesn't have a trailer link`)
  }

  return movie
}

let fromPopcornMovies = (popcornMovies) => {
  let movies = []
  popcornMovies.forEach((popcornMovie) => {
    movies.push(fromPopcornMovie(popcornMovie))
  })
  return movies
}

let fromYtsMovies = (ytsMovies) => {
  let movies = []
  ytsMovies.forEach((ytsMovie) => {
    movies.push(fromYtsMovie(ytsMovie))
  })
  return movies
}

module.exports = {
  fromYtsMovie,
  fromPopcornMovie,
  fromYtsMovies,
  fromPopcornMovies,
}
