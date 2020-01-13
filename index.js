const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const tinify = require('tinify');
const { getOptions } = require('loader-utils');

const userhome = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
const apikeypath = path.join(userhome, '.tinypng');
const NAME = 'Webpack Tinypng Loader';

module.exports = function (content, map, meta) {
  const done = this.async();
  const options = getOptions(this) || {};

  options.cache = path.resolve(options.cache || '.cache/tinify');

  const checksum = crypto.createHash('sha1').update(content.toString('utf8')).digest('hex');
  const checksumfile = path.join(options.cache, checksum);

  if (fs.existsSync(checksumfile)) {
    fs.readFile(checksumfile, (error, body) => {
      return done(null, body);
    });
  } else {
    if (!options.apikey) {
      if (process.env.TINYPNG_KEY) {
        options.apikey = process.env.TINYPNG_KEY;
      } else if (fs.existsSync(apikeypath)) {
        options.apikey = fs.readFileSync(apikeypath, 'utf8').trim();
      }

      if (!options.apikey) {
        this.emitWarning(new Error(`${NAME}: No API key provided for TinyPNG/TinyJPG. **Images not optimized**\nYou can find instructions on getting your API key at https://www.npmjs.com/package/tinify-loader`));
        return done(null, content);
      }
    }

    if (!fs.existsSync(options.cache)) {
      options.cache.split(path.sep).reduce((current, next) => {
        const full = path.resolve(current, next);

        try {
          if (full !== '/') {
            fs.mkdirSync(full);
          }
        } catch (error) {
          if (error.code !== 'EEXIST') {
            this.emitWarning(new Error(`${NAME}: ${error.message}`));
            return done(null, content);
          }
        }

        return full;
      }, '/');
    }

    const timer = setTimeout(() => {
      this.emitWarning(new Error('Tinypng api call timeout.'));
      return done(null, content);
    }, options.timeout || 6e3);

    tinify.key = options.apikey;
    tinify.fromBuffer(content).toBuffer((error, body) => {
      clearTimeout(timer);

      if (error) {
        this.emitWarning(new Error(`${NAME}: ${error.message}`));
        return done(null, content);
      }

      fs.writeFile(checksumfile, body, err => err && console.log(err));

      return done(null, body);
    });
  }
};

module.exports.raw = true;
