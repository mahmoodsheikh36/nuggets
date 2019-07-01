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

let fetchMovies = (pages=1, ytsArgs, cb) => {
  if (pages < 1) {
    if (cb)
      cb()
  } else {
    yts.fetchMovies((content, statusCode) => {
      if (statusCode == 200) {
        let movies = JSON.parse(content).data.movies
        addMovies(movies)
        ytsArgs.page++
        fetchMovies(pages - 1, ytsArgs)
      } else {
        console.error('status code returned from yts is', statusCode)
      }
    }, ytsArgs)
  }
}

let refetchMovies = (pages=1, ytsArgs) => {
  removeAllMovies()
  fetchMovies(pages, ytsArgs, () => {
    console.log('refetched movies')
  })
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
      removeTrailer()
      show($('#video_container'))
      movieBeingWatched = movie
    }
  } else {
    removeOldMovieVideo()
    torrent.stream(movie, (movieTorrentId) => {
      hide($('#movies'), $('#preview_container'))
      removeTrailer()
      show($('#video_container'))
      // console.log(movieTorrentId)
      torrent.append(movieTorrentId, '#video_container')
      movieBeingWatched = movie
      console.log('what')
      getMovieVideo().onkeyup = (event) => {
        event.stopImmediatePropagation()
        switch (event.keyCode) {
        case 76  : // l
          getMovieVideo().currentTime += 10
          break
        case 72: // h
          getMovieVideo().currentTime -= 10
          break
        case 70: // f
          getMovieVideo().requestFullscreen()
          break
        }
      }
    })
  }
}

let removeOldMovieVideo = () => {
  if ($('#trailer_container video') !== null)
    $('#trailer_container').removeChild($('#trailer_container video'))
}

let previewMovie = (movie) => {
  removeTrailer()
  hide($('#movies'), $('#video_container'))
  let movieVideo = getMovieVideo()
  if (movieVideo !== null)
    movieVideo.pause()
  $('#preview_title').innerHTML = movie.title
  $('#preview_year').innerHTML  = movie.year
  $('#preview_desc').innerHTML  = movie.description_full
  $('#preview_image').src       = movie.large_cover_image
  showFlexDisplay($('#preview_container'))
  movieBeingPreviewd = movie
}

let viewMovieList = () => {
  let movieVideo = getMovieVideo()
  if (movieVideo !== null)
    movieVideo.pause()
  removeTrailer()
  hide($('#video_container'), $('#preview_container'))
  showFlexDisplay($('#movies'))
  document.documentElement.scrollTop = scrollAmount
}

let watchTrailer = (movie) => {
  if (movie.yt_trailer_code === '') {
    console.error('movie ' + movie.title + ' has no trailer link')
    return
  }

  let ytIframe = document.createElement('iframe')
  ytIframe.className = 'trailer'
  ytIframe.id        = 'trailer'

  hide($('#video_container'), $('#preview_container'), $('#movies'))

  let ytUrl = 'https://www.youtube.com/embed/' + movie.yt_trailer_code
  ytUrl += '?autoplay=1'

  ytIframe.src = ytUrl

  $('#trailer_container').appendChild(ytIframe)

  show($('#trailer_container'))
}

let removeTrailer = () => {
  if ($('#trailer') !== null)
    $('#trailer_container').removeChild($('#trailer'))
  hide($('#trailer_container'))
}

let getMovieVideo = () => {
  let videoContainer = $('#video_container')
  for (let i = 0; i < videoContainer.childElementCount; ++i) {
    let child = videoContainer.children[i]
    if (child.tagName === 'VIDEO')
      return child
  }
  return null
}

window.onload = () => {
  fetchMovies(2, {page: 1, limit: 50, sort_by: 'seeds'})
  // getMostDownloadedMovies(50, 1)
  // moviePageIndex++
  var theVideo = document.getElementById("cspd_video")
  // document.onkeyup = handleKeyUp
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
    let video = getMovieVideo()
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
  getMovieVideo().pause()
  previewMovie(movieBeingPreviewd)
}

$('#watch_trailer_button').onclick = () => {
  watchTrailer(movieBeingPreviewd)
}
