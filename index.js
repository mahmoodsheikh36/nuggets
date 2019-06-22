const fs = require('fs'),
      readline = require('readline')
const yts = require('./yts.js')

let getMostDownloadedMovies = () => {
  yts.listMovies((content, statusCode) => {
    console.log('status code is: ' + statusCode)
    let movies = JSON.parse(content).data.movies
    addMovies(movies)
    console.log(movies.length + ' movies added')
  }, {limit: 50, sort_by: 'download_count'})
}

let addMovies = (movies) => {
  for (let i = 0; i < movies.length; ++i) {
    addMovie(movies[i])
  }
}

let addMovie = (movie) => {
  console.log('adding movie ' + movie.title_long)
  // console.log(movie)

  // main div
  let movieDiv = document.createElement('div')
  movieDiv.className = 'movie'

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

getMostDownloadedMovies()
