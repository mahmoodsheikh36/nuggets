const WebTorrent = require('webtorrent')
 
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
  let torrentUrl = getMovieTorrentUrl(movie)
  if (torrentUrl === undefined)
    throw new Error('no torrent with 720p or 1080p quality')

  torrentClient.add(getMovieTorrentUrl(movie), (torrent) => {

    torrent.on('done', () => {
      console.log('torrent download finished for movie ' + movie.title_long)
      /* torrentClient.remove(getMovieTorrentUrl(movie)) */
    })

    torrent.on('warning', (err) => {
      console.warn(err)
    })

    cb(torrent.magnetURI)

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

let remove = (movie) => {
  torrentClient.remove(getMovieTorrentUrl(movie))
}

/* looks for 1080p or 720p quality */
/* returns undefined if there isnt 720p or 1080p */
let getMovieTorrentUrl = (movie) => {
  let torrent720p
  movie.torrents.forEach((torrent) => {
    if (torrent.quality === '1080p')
      return torrent.url
    if (torrent720p === undefined && torrent.quality === '720p')
      torrent720p = torrent
  })
  return torrent720p.url
}

module.exports = {
  remove,
  render,
  append,
  stream,
  torrentClient, /* for debugging */
  getMovieTorrentUrl, /* for debugging */
}
