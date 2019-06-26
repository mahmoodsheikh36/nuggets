const fs = require('fs'),
      readline = require('readline')
const yts = require('./yts.js'),
      torrent = require('./torrent.js')

let movies = []
let scrollAmount
let currentMovie

let $ = (query) => {
  return document.querySelector(query)
}

let hide = (domElement) => {
  domElement.style.display = 'none';
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

let previewMovie = (movie) => {
    hide($('#movies'))
    $('#preview_title').innerHTML = movie.title
    $('#preview_year').innerHTML  = movie.year
    $('#preview_desc').innerHTML  = movie.description_full
    $('#preview_image').src       = movie.large_cover_image
    showFlexDisplay($('#preview_container'))
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
  movie.domElement = movieDiv
  movieDiv.className = 'movie'
  // movieDiv.setAttribute('data-movieId', movie.id)
  movieDiv.onclick = () => {
    scrollAmount = document.documentElement.scrollTop
    previewMovie(movie)
    currentMovie = movie
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

$('#watch_button').onclick = () => {
  console.log('watch_button clicked')
  hide($('#preview_container'));
  torrent.stream(currentMovie, '#video_container')
}

window.onload = () => {
  hide($('#preview_container'));
  getMostDownloadedMovies(50, 10)
}

let increaseWatchTime = (movie, cb) => {
  cb()
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
