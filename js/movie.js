const os = require('os'),
      fs = require('fs')

const MOVIES_LOCATION = os.homedir() + '/movies/'

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

    if (dirents.length == 0)
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
  let detailsFile = MOVIES_LOCATION + movieDirName + '/details.json'
  console.log(detailsFile)
  fs.readFile(detailsFile, (err, content) => {
    if (err) {
      console.error(err)
      cb(null)
    }
    let movie = JSON.parse(content)
    cb(movie)
  })
}

module.exports = {
  getSavedMovies,
}
