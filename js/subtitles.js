const request = require('./request.js'),
      fs = require('fs'),
      AdmZip = require('adm-zip')

let fetchSubtitles = (imdbId, path, lang, cb) => {
  let requestOptions = {
    host: 'rest.opensubtitles.org',
    path: `/search/imdbid-${imdbId.substring(2)}`,
    port: 443
  }

  request.request(requestOptions, (content, statusCode) => {
    if (statusCode !== 200) {
      console.error(`error fetching subtitles, status code: ${statusCode}`)
    } else {
      let subtitlesData = JSON.parse(content)
      console.log(subtitlesData)
      let desiredSubtitles
      for (let i = 0; i < subtitlesData.length; ++i) {
        if (subtitlesData[i].LanguageName.toLowerCase() === lang.toLowerCase()) {
          desiredSubtitles = subtitlesData[i]
          break
        }
      }
      if (desiredSubtitles) {
        downloadSubtitles(desiredSubtitles.ZipDownloadLink, path, (subtitlesReady) => {
          cb(subtitlesReady) /* subtitles found and saved in path */
        })
      } else {
        cb(false) /* subtitles not found */
      }
    }
  })
}

let downloadSubtitles = (url, path, cb) => {
  request.getBuffer(url, (buf) => {
    /* content is compressed, we gotta unzip it */
    let zip = AdmZip(buf)
    let foundSubtitles = false
    let zipEntries = zip.getEntries()
    for (let i = 0; i < zipEntries.length && !foundSubtitles; ++i) {
      let entry = zipEntries[i]
      if (entry.name.endsWith('.srt')) {
        foundSubtitles = true
        fs.writeFile(path, srt2webvtt(entry.getData().toString()), (err, data) => {
          if (err)
            console.log(err)
          else
            console.log('saved subtitles to ' + path)
          cb(true)
        })
      }
    }
    if (!foundSubtitles) /* should throw an error or something */
      cb(false)
  })
}

function srt2webvtt(data) {
  // remove dos newlines
  var srt = data.replace(/\r+/g, '');
  // trim white space start and end
  srt = srt.replace(/^\s+|\s+$/g, '');
  // get cues
  var cuelist = srt.split('\n\n');
  var result = "";
  if (cuelist.length > 0) {
    result += "WEBVTT\n\n";
    for (var i = 0; i < cuelist.length; i=i+1) {
      result += convertSrtCue(cuelist[i]);
    }
  }
  return result;
}

function convertSrtCue(caption) {
  // remove all html tags for security reasons
  //srt = srt.replace(/<[a-zA-Z\/][^>]*>/g, '');
  var cue = "";
  var s = caption.split(/\n/);
  // concatenate muilt-line string separated in array into one
  while (s.length > 3) {
    for (var i = 3; i < s.length; i++) {
      s[2] += "\n" + s[i]
    }
    s.splice(3, s.length - 3);
  }
  var line = 0;
  // detect identifier
  if (!s[0].match(/\d+:\d+:\d+/) && s[1].match(/\d+:\d+:\d+/)) {
    cue += s[0].match(/\w+/) + "\n";
    line += 1;
  }
  // get time strings
  if (s[line].match(/\d+:\d+:\d+/)) {
    // convert time string
    var m = s[1].match(/(\d+):(\d+):(\d+)(?:,(\d+))?\s*--?>\s*(\d+):(\d+):(\d+)(?:,(\d+))?/);
    if (m) {
      cue += m[1]+":"+m[2]+":"+m[3]+"."+m[4]+" --> "
        +m[5]+":"+m[6]+":"+m[7]+"."+m[8]+"\n";
      line += 1;
    } else {
      // Unrecognized timestring
      return "";
    }
  } else {
    // file format error or comment lines
    return "";
  }
  // get cue text
  if (s[line]) {
    cue += s[line] + "\n\n";
  }
  return cue;
}

module.exports = {
  fetchSubtitles,
}
