const fs = require('fs'),
      readline = require('readline'),
      os = require('os')
const yts = require('./yts.js'),
      torrent = require('./torrent.js')

let movies = []
let scrollAmount
let currentMovie
let moviePageIndex = 0

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

let addMovies = (movies) => {
  for (let i = 0; i < movies.length; ++i) {
    addMovie(movies[i])
  }
}

let showMovies = () => {
  hide($('#preview_container'))
  show($('#movies'))
  document.documentElement.scrollTop = scrollAmount
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

let watchMovie = (movie) => {
  torrent.stream(movie, (movieTorrentId) => {
    hide($('#movies'), $('#preview_container'))
    console.log(movieTorrentId)
    torrent.append(movieTorrentId, '#video_container')
  })
}

let previewMovie = (movie) => {
  hide($('#movies'))
  $('#preview_title').innerHTML = movie.title
  $('#preview_year').innerHTML  = movie.year
  $('#preview_desc').innerHTML  = movie.description_full
  $('#preview_image').src       = movie.large_cover_image
  showFlexDisplay($('#preview_container'))
  currentMovie = movie
}

let viewMovieList = () => {
  let movieVideo = getMovieVideoElement()
  if (movieVideo !== null)
    $('#movie_video').pause()
  hide($('#video_container'))
  hide($('#preview_container'))
  show($('#movies'))
}

let getMovieVideoElement = () => {
  return $('#video_container').firstElementChild
}

/* shortcuts */
// window.addEventListener('keyup', function () { console.log(arguments) }, true)

window.onload = () => {
  hide($('#preview_container'));
  getMostDownloadedMovies(50, 1)
  moviePageIndex++
}

let nextMostDownloadedMoviePages = () => {
  getMostDownloadedMovies(50, 1, moviePageIndex)
  moviePageIndex++
}

let increaseWatchTime = (movie, cb) => {
  let homeDir = os.homedir()
  let dataFile = homeDir + '/mydata/movie_data.json'
  fs.readFile(dataFile, (err, content) => {
    if (err) throw err
    let movies = JSON.parse(content)
    let foundMovie = false
    movies.forEach((savedMovie) => {
      if (savedMovie.id === movie.id) {
        foundMovie = true
        savedMovie.sec_watched++;
      }
    })

    let simpleMovieData = {}
    if (!foundMovie) {
      simpleMovieData.id            = movie.id
      simpleMovieData.title         = movie.title
      simpleMovieData.title_english = movie.title_english
      simpleMovieData.year          = movie.year
      simpleMovieData.genres        = movie.genres
      simpleMovieData.runtime       = movie.runtime
      simpleMovieData.sec_watched   = 1
      /*
      movieData.cast          = []
      movie.cast.forEach((actor) => {
        movieData.push(actor.name)
      })
      */
      movies.push(simpleMovieData)
    }
    
    fs.writeFile(dataFile, JSON.stringify(movies, null, 2), (err) => {
      if (err) throw err
      cb()
    })

  })
}

/* movie data logging */
let collectData = () => {
  if (typeof currentMovie === 'object') {
    let video = $('#video_container').firstElementChild
    if (video !== null) {
      if (!video.paused) {
        increaseWatchTime(currentMovie, () => {
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
  watchMovie(currentMovie)
}

$('#close_button').onclick = () => {
  viewMovieList()
}
