const WebTorrent = require('webtorrent')
 
let torrentClient = new WebTorrent()
 
torrentClient.on('torrent', function (torrent) {
  console.log('torrent \'' + torrent.name + '\' is now ready')
})

torrentClient.on('error', function (err) {
  throw err
})

/* @movie      - movie to stream
 * @domElement - element to append video to
 * cb          - callback function to call when torrent is ready to be used
 */
let stream = (movie, domQuery) => {
  let torrentUrl = getMovieTorrentUrl(movie)
  if (torrentUrl === undefined)
    throw new Error('no torrent found for 720p or 1080p quality')

  torrentClient.add(getMovieTorrentUrl(movie), (torrent) => {
    // console.log(torrent.infoHash)

    torrent.on('done', () => {
      console.log('torrent download finished for movie ' + movie.title_long)
      /* torrentClient.remove(getMovieTorrentUrl(movie)) */
    })

    torrent.on('metadata', () => {
      /* console.log('metadata is available for torrent') */
    })

    torrent.on('ready', () => {
      // cb()
    })

    torrent.files.forEach((file) => {
      if (file.name.endsWith('.mp4')) {
        file.appendTo(domQuery)
      }
    })
  })
}

let append = (movie, domQuery) => {
  torrentClient.get(getMovieTorrentUrl(movie)).forEach((file) => {
    if (file.name.endsWith('.mp4'))
      file.appendTo(domElement)
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
  append,
  stream,
  torrentClient, /* for debugging */
}
