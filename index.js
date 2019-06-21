const fs = require('fs'),
      readline = require('readline');


let addMovie = () => {
  let movieDiv = document.createElement('div')
  movieDiv.className = 'movie'

  let movieImg = document.createElement('img')
  movieImg.src = 'https://m.media-amazon.com/images/I/A1Uao+8kVlL._SS500_.jpg'
  movieDiv.append(movieImg)

  let titleDiv = document.createElement('div')
  titleDiv.innerHTML = 'movie title'
  titleDiv.className = 'title'
  movieDiv.append(titleDiv)

  let moviesDiv = document.getElementById('movies')
  moviesDiv.appendChild(movieDiv)
}
