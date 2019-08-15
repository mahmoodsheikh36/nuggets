const fs = require('fs'),
      readline = require('readline'),
      os = require('os')
const yts = require('./js/yts.js'),
      torrent = require('./js/torrent.js'),
      subtitles = require('./js/subtitles.js'),
      popcorn = require('./js/popcorn.js'),
      movieLib = require('./js/movie.js'),
      server = require('./js/server.js')

const MOVIES_LOCATION = os.homedir() + '/movies/'

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
    // if (cb)
    //   cb()
  } else {
    yts.fetchMovies((content, statusCode) => {
      if (statusCode === 200) {
        let ytsMovies = JSON.parse(content).data.movies
        if (ytsMovies) {
          let movies = movieLib.fromYtsMovies(ytsMovies)
          addMovies(movies)
          cb(ytsArgs.page)
          ytsArgs.page++
          fetchMovies(pages - 1, ytsArgs, cb)
        } else {
          console.log('no more movies, fetched as many as possible from yts')
        }
      } else {
        console.error('status code returned from yts is', statusCode)
      }
    }, ytsArgs)
  }
}

let refetchMovies = (pages=1, ytsArgs) => {
  hoveredMovie = undefined
  let firstPage = ytsArgs.page
  removeAllMovies()
  fetchMovies(pages, ytsArgs, (page) => {
    switch(page) {
    case 1:
      if (movies.length > 0)
        setHoveredMovie(movies[0])
      break
    case firstPage + pages:
      console.log('finished refetching movies')
      break
    }
  })
}

let addMovie = (movie) => {
  let movieExists = false;
  movies.forEach((movieInList) => {
    if (movie.imdbId === movieInList.imdbId) {
      movieExists = true
      return
    }
  })
  if (movieExists) {
    return
  }

  movies.push(movie)
  movie.index = movies.length - 1
  // main div
  let movieDiv = document.createElement('div')
  movie.domElement = movieDiv

  movieDiv.className = 'movie'
  movieDiv.onclick = () => {
    previewMovie(movie, true)
    setHoveredMovie(movie)
  }

  // image
  let movieImg = document.createElement('img')
  movieImg.src = movie.coverImage
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
      if (document.webkitFullscreenElement === getMovieVideo())
        document.webkitExitFullscreen()
      else
        getMovieVideo().webkitRequestFullscreen()
      break
    case 'Escape':
      previewMovie(movieBeingPreviewd)
      break
    }
  }
  hide($('#movies'), $('#preview_container'))
  hide($('#top_bar'))
  removeTrailer()
  showFlexDisplay($('#video_container'))
  getMovieVideo().focus()
  getMovieVideo().webkitRequestFullscreen()

}

let addSubtitles = (movie) => {
  let subtitles = document.createElement('track')
  subtitles.src  = movie.path + '/subtitles.vtt'
  subtitles.kind = 'subtitles'
  subtitles.srclang = 'en'
  subtitles.label = 'English'

  getMovieVideo().appendChild(subtitles)
  getMovieVideo().textTracks[0].mode = 'showing'
}

let refetchSubtitles = (movie) => {
  subtitles.fetchSubtitles(movie.imdbId, movie.path + '/subtitles.vtt', 'english', () => {
    /* console.log('got subtitles yay!') */
    addSubtitles(movie)
    console.log('added subtitles to video')
  })
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

let rewatchMovie = (movie) => {
  torrent.remove(movie)
  watchMovie(movie)
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
      let moviePath = decodeURIComponent(movieTorrent.path + movieTorrent.name)
      movie.path = moviePath

      subtitles.fetchSubtitles(movie.imdbId, moviePath + '/subtitles.vtt', 'english', () => {
        /* console.log('got subtitles yay!') */
        addSubtitles(movie)
        console.log('added subtitles to video')
      })

      fs.writeFile(moviePath + '/movie.json', JSON.stringify(movie, null, 2), (err, data) => {
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

let previewMovie = (movie, updateScrollAmount=false) => {
  if (typeof movie !== 'object')
    return
  removeMovieVideo()
  if (updateScrollAmount)
    scrollAmount = document.documentElement.scrollTop
  removeTrailer()
  removeMovieVideo()
  hide($('#movies'), $('#video_container'), $('#top_bar'))
  $('#preview_title').innerHTML = movie.title
  $('#preview_year').innerHTML  = movie.year
  $('#preview_desc').innerHTML  = movie.desc
  $('#preview_image').src       = movie.coverImage

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
  removeTrailer()
  removeMovieVideo()
  hide($('#video_container'), $('#preview_container'))
  showFlexDisplay($('#top_bar'))
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

  hide($('#video_container'), $('#preview_container'), $('#movies'),
       $('#top_bar'))

  // let ytUrl = movie.trailer
  // ytUrl += '?autoplay=1'
  ytIframe.src = movie.trailer + '?autoplay=1'

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

let showSavedMovies = () => {
  removeAllMovies()
  getSavedMovies((savedMovies) => {
    addMovies(savedMovies)
  })
}

window.onload = () => {
  // getSavedMovies((savedMovies) => {
  //   addMovies(savedMovies)
  // })

  fetchPopcornMovies(20, {page: 1, sort: 'trending'}, (pageFetched) => {
    console.log(`page ${pageFetched} fetched`)
  })
  // showSavedMovies()

  // fetchMovies(1, {page: 1, limit: 50, sort_by: 'peers', genre: 'romance'})
}

/* movie data logging */
let increaseWatchTime = (movie, dataFile, seconds, cb) => {
  fs.readFile(dataFile, (err, content) => {
    if (err) {
      throw err
      alert(err)
    }
    let movies = JSON.parse(content)
    let foundMovie = false
    movies.forEach((savedMovie) => {
      if (savedMovie.imdbId === movie.imdbId) {
        foundMovie = true
        savedMovie.secWatched += seconds
      }
    })

    if (!foundMovie) {
      let movieData = {}
      movieData.imdbId        = movie.imdbId
      movieData.title         = movie.title
      movieData.year          = movie.year
      movieData.genres        = movie.genres
      movieData.runtime       = movie.runtime
      movieData.secWatched   = 1
      movieData.timesPlayed  = 1
      /*
      movieData.cast          = []
      movie.cast.forEach((actor) => {
        movieData.push(actor.name)
      })
      */
      movies.push(movieData)
    }
    
    fs.writeFile(dataFile, JSON.stringify(movies, null, 2), (err) => {
      if (err) {
        throw err
        alert(err)
      }
      previousMovie = movie
      /* cb() */
    })

  })
  cb() /* idk if its stupid to not wait for previous call to finish */
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

let getSavedMovies = (cb) => {
  let savedMovies = []
  let options = {
    withFileTypes: true,
  }
  fs.readdir(MOVIES_LOCATION, options, (err, dirents) => {
    if (err) {
      cosnole.error(err)
      /* error listing directory = no movies saved */
      cb([])
    }

    if (dirents.length === 0)
      cb([])
    console.log(dirents.length + ' saved movies found')

    getAllSavedMovieDetails(dirents, dirents.length, savedMovies, () => {
      cb(savedMovies)
    })

  })

}

let getAllSavedMovieDetails = (dirents, direntsLength, movieList, cb) => {
  if (direntsLength < 1) {
    cb()
    return
  }
  getSavedMovieDetails(dirents[direntsLength - 1].name, (movie) => {
    if (movie !== null)
      movieList.push(movie)
    getAllSavedMovieDetails(dirents, direntsLength - 1, movieList, cb)
  })
}

let getSavedMovieDetails = (movieDirName, cb) => {
  let detailsFile = MOVIES_LOCATION + movieDirName + '/movie.json'
  fs.readFile(detailsFile, (err, content) => {
    if (err) {
      console.error(err)
      cb(null)
    }
    let movie = JSON.parse(content)
    cb(movie)
  })
}

let fetchMovieDetails = (movieId, cb) => {
  yts.fetchMovieDetails((content, statusCode) => {
    if (statusCode === 200) {
      let movieDetails = JSON.parse(content).data.movie
      cb(movieDetails)
    } else {
      console.error(`failed to fetch movie details, status Code: ${statusCode}`)
      cb()
    }
  }, {movie_id: movieId})
}

let fetchParentalGuide = (movie, cb) => {
  yts.fetchParentalGuide((content, statusCode) => {
    let parentalGuide = JSON.parse(content)
    cb(parentalGuide)
  }, movie.id)
}

let fetchUpcomingMovies = (cb) => {
  yts.fetchUpcomingMovies((content, statusCode) => {
    if (statusCode === 200) {
      let upcomingMovies = JSON.parse(content)
      cb(upcomingMovies)
    } else {
      console.error(`failed to fetch upcoming movies, status code: ${statusCode}`)
      cb()
    }
  })
}

let fetchPopcornMovies = (pages, options, cb) => {
  if (pages < 1)
    return
  popcorn.fetchMovies((err, popcornMovies) => {
    if (err)
      console.error(err)
    else {
      addMovies(movieLib.fromPopcornMovies(popcornMovies))
      cb(options.page)
      options.page++
      fetchPopcornMovies(pages - 1, options, cb)
    }
  }, options)
}

let refetchPopcornMovies = (pages, options, cb) => {
  hoveredMovie = undefined
  removeAllMovies()
  fetchPopcornMovies(pages, options, (pageFetched) => {
    console.log(`page ${pageFetched} fetched`)
  })
}

let prevCollectDataDate;
let collectData = (dataFile) => {
  let now = new Date()
  if (typeof movieBeingWatched === 'object') {
    let video = getMovieVideo()
    if (video !== null) {
      let is_movie_playing
      is_movie_playing = video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2
      if (is_movie_playing) {
        let seconds = 0
        if (prevCollectDataDate) {
          seconds = (now - prevCollectDataDate) / 1000
        }
        increaseWatchTime(movieBeingWatched, dataFile, seconds, () => {
          setTimeout(function() {
            collectData(dataFile)
          }, 1000)
        })
        prevCollectDataDate = now
        return
      }
    }
  }
  prevCollectDataDate = now
  setTimeout(collectData, 1000, dataFile)
}

let DATA_FILE = os.homedir() + '/mydata/movie_data.json'

if (fs.existsSync(DATA_FILE)) {
  collectData(DATA_FILE)
} else {
  console.log('data file doesnt exist, not saving data')
}

let setHoveredMovie = (movie) => {
  if (hoveredMovie !== undefined) {
    hoveredMovie.domElement.style.borderColor = ''
    hoveredMovie.domElement.style.backgroundColor = ''
  }
  hoveredMovie = movie
  if (document.documentElement.offsetHeight + document.documentElement.scrollTop < movie.domElement.offsetTop + movie.domElement.offsetHeight)
    document.documentElement.scrollTop = (movie.domElement.offsetTop + movie.domElement.offsetHeight) - document.documentElement.offsetHeight
  if (movie.domElement.offsetTop < document.documentElement.scrollTop) {
    // 33 is the value of padding-top on the movies_container
    let moviesContainerStyle = window.getComputedStyle($('#movies'))
    let moviesContainerTopPadding = moviesContainerStyle.getPropertyValue('padding-top')
    document.documentElement.scrollTop = movie.domElement.offsetTop - parseInt(moviesContainerTopPadding)
  }
  movie.domElement.style.borderColor = 'red'
  movie.domElement.style.backgroundColor = '#2d7758'
}

/* vim keys yay! */
let handleKey = (key) => {
  if (isVisible($('#movies'))) {
    switch (event.key) {
    case 'j': // j
      if (hoveredMovie === undefined) {
        setHoveredMovie(movies[0])
        break
      }
      let firstMovieInRowBelow
      let found = false
      for (let i = hoveredMovie.index; i < movies.length; ++i) {
        if (movies[i].domElement.offsetTop > hoveredMovie.domElement.offsetTop) {
          if (firstMovieInRowBelow === undefined) {
            firstMovieInRowBelow = movies[i]
          }
          if (movies[i].domElement.offsetLeft === hoveredMovie.domElement.offsetLeft) {
            setHoveredMovie(movies[i])
            found = true
            break
          }
        }
      }
      if (!found && firstMovieInRowBelow !== undefined) {
        setHoveredMovie(firstMovieInRowBelow)
      }
      break
    case 'k': // k
      if (hoveredMovie === undefined) {
        setHoveredMovie(movies[0])
        break
      }
      let lastMovieInRowAbove
      let foundMovie = false
      for (let i = hoveredMovie.index; i >= 0; --i) {
        if (movies[i].domElement.offsetTop < hoveredMovie.domElement.offsetTop) {
          if (lastMovieInRowAbove === undefined) {
            lastMovieInRowAbove = movies[i]
          }
          if (movies[i].domElement.offsetLeft === hoveredMovie.domElement.offsetLeft) {
            setHoveredMovie(movies[i])
            foundMovie = true
            break
          }
        }
      }
      if (!foundMovie && lastMovieInRowAbove !== undefined) {
        setHoveredMovie(lastMovieInRowAbove)
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
    case 'v':
    case 'Enter': // enter
      if (hoveredMovie === undefined) {
        setHoveredMovie(movies[0])
        break
      }
      previewMovie(hoveredMovie, true)
      break
    case 'G': // g
      document.documentElement.scrollTop = document.documentElement.scrollHeight
      setHoveredMovie(movies[movies.length - 1])
      break
    case 'g':
      document.documentElement.scrollTop = 0
      setHoveredMovie(movies[0])
      break
    case '$':
      let foundLastInLineMovie = false
      for (let i = hoveredMovie.index; i < movies.length; ++i) {
        if (movies[i].domElement.offsetTop > hoveredMovie.domElement.offsetTop) {
          foundLastInLineMovie = true
          setHoveredMovie(movies[i - 1])
          break
        }
      }
      if (!foundLastInLineMovie)
        setHoveredMovie(movies[movies.length - 1])
      break
    case '^':
      let foundFirstInLineMovie = false
      for (let i = hoveredMovie.index; i >= 0; --i) {
        if (movies[i].domElement.offsetTop < hoveredMovie.domElement.offsetTop) {
          foundFirstInLineMovie = true
          setHoveredMovie(movies[i + 1])
          break
        }
      }
      if (!foundFirstInLineMovie)
        setHoveredMovie(movies[0])
      break
    case 'Escape':
      repeatStr = '0'
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

let repeatStr = '0'
document.onkeydown = (event) => {
  if (!isNaN(event.key) && event.key !== ' ') {
    repeatStr += event.key
  } else {
    let count = parseInt(repeatStr)
    if (count === 0)
      count = 1
    for (let i = 0; i < count; ++i) {
      handleKey(event.key)
    }
    repeatStr = '0';
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
