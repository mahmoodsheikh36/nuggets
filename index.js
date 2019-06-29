const fs = require('fs'),
      readline = require('readline'),
      os = require('os')
const yts = require('./yts.js'),
      torrent = require('./torrent.js')

let movies = []
let scrollAmount
let movieBeingPreviewd
let moviePageIndex = 0
let movieBeingWatched

let $ = (query) => {
  return document.querySelector(query)
}

let hide = (...domElements) => {
  domElements.forEach((domElement) => {
    domElement.style.display = 'none';
  })
}
let show = (domElement) => {
  domElement.style.display = 'block';
}
let showFlexDisplay = (domElement) => {
  domElement.style.display = 'flex';
}

let getMostDownloadedMovies = (moviesPerPage=50, pages=1, page=1) => {
  if (pages < 1)
    return
  console.log('fetching movie page of size', moviesPerPage)
  yts.fetchMovies((content, statusCode) => {
    if (statusCode == 200) {
      let movies = JSON.parse(content).data.movies
      addMovies(movies)
      console.log('fetched movie page')
      getMostDownloadedMovies(moviesPerPage, pages - 1, page + 1)
    } else {
      console.error('status code returned from yts is', statusCode)
    }
  }, {limit: moviesPerPage, sort_by: 'download_count', page:page})
}

let fetchMovies = (pages=1, page=1, ytsArgs) => {
  if (pages < 1)
    return
  yts.fetchMovies((content, statusCode) => {
    if (statusCode == 200) {
      let movies = JSON.parse(content).data.movies
      addMovies(movies)
      fetchMovies(pages - 1, page + 1, ytsArgs)
    } else {
      console.error('status code returned from yts is', statusCode)
    }
  }, ytsArgs)
}

let nextMostDownloadedMoviesPage = () => {
  getMostDownloadedMovies(50, 1, moviePageIndex)
  moviePageIndex++
}

let addMovie = (movie) => {
  movies.push(movie)
  // main div
  let movieDiv = document.createElement('div')
  // movie.domElement = movieDiv
  movieDiv.className = 'movie'
  movieDiv.onclick = () => {
    scrollAmount = document.documentElement.scrollTop
    previewMovie(movie)
  }

  // image
  let movieImg = document.createElement('img')
  movieImg.src = movie.medium_cover_image
  movieDiv.append(movieImg)

  // title
  let titleDiv = document.createElement('div')
  titleDiv.innerHTML = movie.title
  titleDiv.className = 'title'
  movieDiv.append(titleDiv)

  let moviesDiv = document.getElementById('movies')
  moviesDiv.appendChild(movieDiv)
}

let addMovies = (movies) => {
  for (let i = 0; i < movies.length; ++i) {
    addMovie(movies[i])
  }
}

let removeAllMovies = () => {
  let moviesContainer = $('#movies')
  while (moviesContainer.lastChild !== null) {
    moviesContainer.removeChild(moviesContainer.lastChild)
  }
  movies = []
}

let watchMovie = (movie) => {
  if (movieBeingWatched !== undefined) {
    if (movieBeingWatched.id === movie.id) {
      console.log('resuming movie ' + movie.title)
      hide($('#movies'), $('#preview_container'))
      show($('#video_container'))
      movieBeingWatched = movie
    }
  } else {
    torrent.stream(movie, (movieTorrentId) => {
      hide($('#movies'), $('#preview_container'))
      show($('#video_container'))
      // console.log(movieTorrentId)
      torrent.append(movieTorrentId, '#video_container')
      movieBeingWatched = movie
    })
  }
}

let previewMovie = (movie) => {
  hide($('#movies'), $('#video_container'))
  $('#preview_title').innerHTML = movie.title
  $('#preview_year').innerHTML  = movie.year
  $('#preview_desc').innerHTML  = movie.description_full
  $('#preview_image').src       = movie.large_cover_image
  showFlexDisplay($('#preview_container'))
  movieBeingPreviewd = movie
}

let viewMovieList = () => {
  let movieVideo = getMovieVideoElement()
  if (movieVideo !== null)
    movieVideo.pause()
  hide($('#video_container'))
  hide($('#preview_container'))
  showFlexDisplay($('#movies'))
  document.documentElement.scrollTop = scrollAmount
}

let getMovieVideoElement = () => {
  let videoContainer = $('#video_container')
  for (let i = 0; i < videoContainer.childElementCount; ++i) {
    let child = videoContainer.children[i]
    if (child.tagName === 'VIDEO')
      return child
  }
  return null
}

/* shortcuts */
// window.addEventListener('keyup', function () { console.log(arguments) }, true)

window.onload = () => {
  hide($('#preview_container'));
  // getMostDownloadedMovies(50, 1)
  moviePageIndex++
}

/* movie data logging */
let previousMovie
let increaseWatchTime = (movie, dataFile, cb) => {
  fs.readFile(dataFile, (err, content) => {
    if (err) {
      throw err
      alert(err)
    }
    let movies = JSON.parse(content)
    let foundMovie = false
    movies.forEach((savedMovie) => {
      if (savedMovie.id === movie.id) {
        foundMovie = true
        savedMovie.sec_watched++;
        if (previousMovie === undefined || movie.id !== previousMovie.id)
          savedMovie.times_played++
      }
    })

    if (!foundMovie) {
      let simpleMovieData = {}
      simpleMovieData.id            = movie.id
      simpleMovieData.title         = movie.title
      simpleMovieData.title_english = movie.title_english
      simpleMovieData.year          = movie.year
      simpleMovieData.genres        = movie.genres
      simpleMovieData.runtime       = movie.runtime
      simpleMovieData.sec_watched   = 1
      simpleMovieData.times_played  = 1
      /*
      movieData.cast          = []
      movie.cast.forEach((actor) => {
        movieData.push(actor.name)
      })
      */
      movies.push(simpleMovieData)
    }
    
    fs.writeFile(dataFile, JSON.stringify(movies, null, 2), (err) => {
      if (err) {
        throw err
        alert(err)
      }
      previousMovie = movie
      cb()
    })

  })
}

let collectData = () => {
  let homeDir = os.homedir()
  let dataFile = homeDir + '/mydata/movie_data.json'

  if (!fs.existsSync(dataFile)) {
    console.log('data directory doesnt exist, not saving data')
    return
  }

  if (typeof movieBeingWatched === 'object') {
    let video = getMovieVideoElement()
    if (video !== null) {
      let is_movie_playing
      is_movie_playing = video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2
      if (is_movie_playing) {
        increaseWatchTime(movieBeingWatched, dataFile, () => {
          setTimeout(collectData, 1000)
        })
        return
      }
    }
  }
  setTimeout(collectData, 1000)
}

collectData()

/* button clicking events */
$('#watch_button').onclick = () => {
  watchMovie(movieBeingPreviewd)
}

$('#preview_close_button').onclick = () => {
  viewMovieList()
}

$('#video_close_button').onclick = () => {
  previewMovie(movieBeingPreviewd)
}
