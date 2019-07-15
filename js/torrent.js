const WebTorrent = require('webtorrent')
const os = require('os')
 
let torrentClient = new WebTorrent()
 
torrentClient.on('torrent', (torrent) => {
  console.log('torrent \'' + torrent.name + '\' is now ready')
})

torrentClient.on('error', function (err) {
  throw err
})

/* @movie      - movie to stream
 * @domElement - element to append video to
 * cb          - callback function to call with the torrent id when its ready to be used
 */
let stream = (movie, cb) => {
  let torrentUrl = movie.torrent1080p.url
  if (torrentUrl === undefined)
    throw new Error('no torrent with 720p or 1080p quality')

  let movieDir = os.homedir() + '/movies/'
  torrentClient.add(torrentUrl, { path: movieDir }, (torrent) => {

    torrent.on('done', () => {
      console.log('torrent download finished for movie ' + movie.title_long)
      /* torrentClient.remove(getMovieTorrentUrl(movie)) */
    })

    torrent.on('warning', (err) => {
      console.warn(err)
    })

    cb(torrent)

  })
}

let render = (torrentId, domQuery) => {
  torrentClient.get(torrentId).files.forEach((file) => {
    if (file.name.endsWith('.mp4'))
      file.renderTo(domQuery)
  })
}

let append = (torrentId, domQuery) => {
  torrentClient.get(torrentId).files.forEach((file) => {
    if (file.name.endsWith('.mp4'))
      file.appendTo(domQuery)
  })
}

/* doesnt work, should use torrent.magnetURI when calling client.remove */
let remove = (movie) => {
  torrentClient.remove(movie.torrent.magnetURI)
}

module.exports = {
  remove,
  render,
  append,
  stream,
  torrentClient, /* for debugging */
}
