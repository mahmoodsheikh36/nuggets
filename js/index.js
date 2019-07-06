const fs = require('fs'),
      readline = require('readline'),
      os = require('os')
const yts = require('./js/yts.js'),
      torrent = require('./js/torrent.js'),
      movieLib = require('./js/movie.js'),
      subtitles = require('./js/subtitles.js')

const ALLOW_MOUSE_NAVIGATION = false

let movies = []
let scrollAmount
let movieBeingPreviewd
let movieBeingWatched
let hoveredMovie

let $ = (query) => {
  return document.querySelector(query)
}

let hide = (...domElements) => {
  domElements.forEach((domElement) => {
    domElement.style.display = 'none'
  })
}
let show = (domElement) => {
  domElement.style.display = 'block'
}
let showFlexDisplay = (domElement) => {
  domElement.style.display = 'flex'
}
let isVisible = (domElement) => {
  return domElement.style.display !== 'none'
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
  hoveredMovie = undefined
  removeAllMovies()
  fetchMovies(pages, ytsArgs, () => {
    console.log('refetched movies')
  })
}

let addMovie = (movie) => {
  movies.push(movie)
  movie.index = movies.length - 1
  // main div
  let movieDiv = document.createElement('div')
  movie.domElement = movieDiv

  movieDiv.className = 'movie'
  movieDiv.onclick = () => {
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

  if (ALLOW_MOUSE_NAVIGATION) {
    movieDiv.onmouseover = (event) => {
      setHoveredMovie(movie)
    }
  }

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

let setMovieVideo = (movie) => {
  movieBeingWatched = movie
  getMovieVideo().onkeydown = (event) => {
    event.stopImmediatePropagation()
    switch (event.key) {
    case 'l':
      getMovieVideo().currentTime += 10
      break
    case 'h':
      getMovieVideo().currentTime -= 10
      break
    case 'f':
      if (document.fullscreenElement === getMovieVideo())
        document.exitFullscreen()
      else
        getMovieVideo().requestFullscreen()
      break
    case 'Escape':
      previewMovie(movieBeingPreviewd)
      break
    }
  }
  hide($('#movies'), $('#preview_container'))
  removeTrailer()
  show($('#video_container'))
  getMovieVideo().focus()
  getMovieVideo().requestFullscreen()

}

let addSubtitles = (movie) => {
  let subtitles = document.createElement('track')
  subtitles.src  = getMoviePath(movie) + '/subtitles.vtt'
  subtitles.kind = 'subtitles'
  subtitles.srclang = 'en'
  subtitles.label = 'English'

  getMovieVideo().appendChild(subtitles)
  getMovieVideo().textTracks[0].mode = 'showing'
}

let delaySubtitles = (seconds) => {
  let subtitlesTrack = getMovieVideo().textTracks[0]
  for (let i = 0; i < subtitlesTrack.cues.length; ++i) {
    let cue = subtitlesTrack.cues[i]
    cue.startTime += seconds
    cue.endTime += seconds
  }
  console.log(`delayed subtitles by ${seconds} seconds`)
}

let getMoviePath = (movie) => {
  return movie.torrent.path + movie.torrent.name
}

let watchMovie = (movie) => {
  removeMovieVideo()
  if (movie.torrent !== undefined) {
    console.log('torrent already being streamed for movie \'' + movie.title + '\'')
    let torrentId = movie.torrent.magnetURI
    torrent.append(torrentId, '#video_container')
    setMovieVideo(movie)
  } else {
    torrent.stream(movie, (movieTorrent) => {
      let torrentId = movieTorrent.magnetURI
      let moviePath = movieTorrent.path + movieTorrent.name

      subtitles.fetchSubtitles(movie.imdb_code, moviePath + '/subtitles.vtt', 'english', () => {
        /* console.log('got subtitles yay!') */
        addSubtitles(movie)
        console.log('added subtitles to video')
      })

      fs.writeFile(moviePath + '/details.json', JSON.stringify(movie, null, 2), (err, data) => {
        if (err) throw err
        console.log('saved movie details for \'' + movie.title + '\'')
      })
      /* write details file before setting movie.torrent, torrent is circular */
      movie.torrent = movieTorrent
      torrent.append(torrentId, '#video_container')
      setMovieVideo(movie)
    })
  }
}

let removeMovieVideo = () => {
  if ($('#video_container video') !== null)
    $('#video_container').removeChild($('#video_container video'))
}

let previewMovie = (movie) => {
  if (typeof movie !== 'object')
    return
  removeMovieVideo()
  scrollAmount = document.documentElement.scrollTop
  removeTrailer()
  removeMovieVideo()
  hide($('#movies'), $('#video_container'))
  $('#preview_title').innerHTML = movie.title
  $('#preview_year').innerHTML  = movie.year
  $('#preview_desc').innerHTML  = movie.description_full
  $('#preview_image').src       = movie.large_cover_image

  let genres_str = 'genres: '
  for (let i = 0; i < movie.genres.length; ++i) {
    let genre = movie.genres[i]
    if (i === movie.genres.length - 1)
      genres_str += genre
    else
      genres_str += genre + ', '
  }

  $('#preview_genres').innerHTML = genres_str

  showFlexDisplay($('#preview_container'))
  movieBeingPreviewd = movie
}

let viewMovieList = () => {
  removeMovieVideo()
  removeTrailer()
  removeMovieVideo()
  hide($('#video_container'), $('#preview_container'))
  showFlexDisplay($('#movies'))
  document.documentElement.scrollTop = scrollAmount
}

let relistMovies = (newMovies) => {
  removeAllMovies()
  addMovies(newMovies)
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

let listSavedMovies = () => {
  movieLib.getSavedMovies((savedMovies) => {
    addMovies(savedMovies)
  })
}

let getMovieSubtitles = (movie) => {
  
}

window.onload = () => {
  movieLib.getSavedMovies((savedMovies) => {
    addMovies(savedMovies)
  })
  // fetchMovies(1, {page: 1, limit: 50, sort_by: 'peers', genre: 'romance'})
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
        savedMovie.sec_watched++
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

let searchMovies = (pattern, movieList=movies) => {
  let moviesMatched = []
  let regex = new RegExp(pattern, 'i')
  for (let i = 0; i < movieList.length; ++i) {
    let movie = movieList[i]
    if (regex.test(movie.title))
      moviesMatched.push(movie)
  }
  relistMovies(moviesMatched)
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

let setHoveredMovie = (movie) => {
  if (hoveredMovie !== undefined) {
    hoveredMovie.domElement.style.borderColor = ''
    hoveredMovie.domElement.style.backgroundColor = ''
  }
  hoveredMovie = movie
  if (document.documentElement.offsetHeight + document.documentElement.scrollTop < movie.domElement.offsetTop + movie.domElement.offsetHeight)
    document.documentElement.scrollTop = (movie.domElement.offsetTop + movie.domElement.offsetHeight) - document.documentElement.offsetHeight
  if (movie.domElement.offsetTop < document.documentElement.scrollTop)
    document.documentElement.scrollTop = movie.domElement.offsetTop
  movie.domElement.style.borderColor = 'red'
  movie.domElement.style.backgroundColor = '#2d7758'
}

/* vim keys yay! */
document.onkeydown = (event) => {
  if (isVisible($('#movies'))) {
    switch (event.key) {
    case 'j': // j
      if (hoveredMovie === undefined) {
        setHoveredMovie(movies[0])
        break
      }
      for (let i = hoveredMovie.index; i < movies.length; ++i) {
        if (movies[i].domElement.offsetTop > hoveredMovie.domElement.offsetTop) {
          if (movies[i].domElement.offsetLeft === hoveredMovie.domElement.offsetLeft) {
            setHoveredMovie(movies[i])
            break
          }
        }
      }
      break
    case 'k': // k
      if (hoveredMovie === undefined) {
        setHoveredMovie(movies[0])
        break
      }
      for (let i = hoveredMovie.index; i >= 0; --i) {
        if (movies[i].domElement.offsetTop < hoveredMovie.domElement.offsetTop) {
          if (movies[i].domElement.offsetLeft === hoveredMovie.domElement.offsetLeft) {
            setHoveredMovie(movies[i])
            break
          }
        }
      }
      break
    case 'l': // l
      if (hoveredMovie === undefined) {
        setHoveredMovie(movies[0])
        break
      }
      if (hoveredMovie.index + 1 < movies.length) {
        setHoveredMovie(movies[hoveredMovie.index + 1])
      }
      break
    case 'h': // h
      if (hoveredMovie === undefined) {
        setHoveredMovie(movies[0])
        return
      }
      if (hoveredMovie.index - 1 >= 0) {
        setHoveredMovie(movies[hoveredMovie.index - 1])
      }
      break
    case ' ':
      event.preventDefault()
    case 'Enter': // enter
      if (hoveredMovie === undefined) {
        setHoveredMovie(movies[0])
        break
      }
      previewMovie(hoveredMovie)
      break
    case 'G': // g
      document.documentElement.scrollTop = document.documentElement.scrollHeight
      setHoveredMovie(movies[movies.length - 1])
      break
    case 'g':
      document.documentElement.scrollTop = 0
      setHoveredMovie(movies[0])
      break
    case 'Escape':
      break
    }
  }
  if (isVisible($('#preview_container'))) {
    switch (event.key) {
    case 'Escape':
      viewMovieList()
      break
    case 'w': // watch
      watchMovie(movieBeingPreviewd)
      break
    case 't':
      watchTrailer(movieBeingPreviewd)
      break
    }
  }
}

/* general events */
$('#watch_button').onclick = () => {
  watchMovie(movieBeingPreviewd)
}

$('#preview_close_button').onclick = () => {
  viewMovieList()
}

$('#video_close_button').onclick = () => {
  /* getMovieVideo().pause() */
  previewMovie(movieBeingPreviewd)
  removeMovieVideo()
}

$('#watch_trailer_button').onclick = () => {
  watchTrailer(movieBeingPreviewd)
}

$('#trailer_close_button').onclick = () => {
  removeTrailer()
  previewMovie(movieBeingPreviewd)
}
