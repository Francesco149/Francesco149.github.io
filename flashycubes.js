// this is free and unencumbered software released into the public domain
// refer to the attached UNLICENSE or http://unlicense.org/
//
// music: To the Next Destination by TeknoAXE
//
// the music is licensed under a Creative Commons Attribution 4.0
// International License https://creativecommons.org/licenses/by/4.0/

var flashycubes = {};

(function() {
  'use strict';

  var MID_THRESHOLD = 0.1;
  var HIGH_THRESHOLD = 0.5;
  var AMPLITUDE_SAMPLES = 1024;
  var N_STARS = 727;
  var PARALLAX_AMOUNT = 0.4;
  var MUSIC_FILE = 'To_the_Next_Destination.ogg';
  var MUSIC_OFFSET = 25;
  var FADE_TIME = 5;
  var VOLUME_FADE_TIME = 0.1;
  var INITIAL_VOLUME = 0.5;
  var VOLUME_TICK = 0.05;
  var NOAUDIO_AMPLITUDE = 0.05;
  var NOAUDIO_LOW = 0.6;
  var NOAUDIO_MID = 0.1;
  var NOAUDIO_HIGH = 0.1;

  var gfx;
  var size;
  var aspect;

  var audio;
  var analyser;
  var gainNode;
  var initialGainNode;
  var soundBuffer;
  var frequencyBuffer;
  var volumeDisplay;
  var curVolume;

  var lastFrameTime = Date.now();
  var deltaTime = 0;
  var amplitude = 0;
  var low = 0;
  var mid = 0;
  var high = 0;
  var stars = [];
  var rotation = 0;
  var parallax = [0, 0];
  var lineWidth = 2;

  function initGraphics(canvas) {
    gfx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize, false);
    window.addEventListener('wheel', wheel, false);
    window.addEventListener('mousemove', mousemove, false);
    window.requestAnimationFrame(tick);
  }

  function hasAudio() {
    return (
      'AudioContext' in window &&
      'createAnalyser' in window.AudioContext.prototype &&
      'Uint8Array' in window
    );
  }

  function getPreviousVolume() {
    if (typeof(Storage) !== 'undefined') {
      var previousVolumeStr = localStorage.getItem('volumeLevel');
      if (previousVolumeStr) {
        var previousVolume = parseFloat(previousVolumeStr);
        return isNaN(previousVolume) ? INITIAL_VOLUME : previousVolume;
      }
    }

    return INITIAL_VOLUME;
  }

  function initAudio(volume) {
    volumeDisplay = volume;

    if (!hasAudio()) {
      amplitude = NOAUDIO_AMPLITUDE;
      low = NOAUDIO_LOW;
      mid = NOAUDIO_MID;
      high = NOAUDIO_HIGH;
      return;
    }

    audio = new AudioContext();
    gainNode = audio.createGain();
    gainNode.connect(audio.destination);
    initialGainNode = audio.createGain();
    initialGainNode.connect(gainNode);
    analyser = audio.createAnalyser();
    analyser.fftSize = AMPLITUDE_SAMPLES;
    analyser.connect(initialGainNode);
    setVolume(getPreviousVolume());

    var Uint8Array = window.Uint8Array;
    soundBuffer = new Uint8Array(analyser.fftSize);
    frequencyBuffer = new Uint8Array(analyser.frequencyBinCount);

    loadSound(MUSIC_FILE, function(buffer) {
      playSound(buffer, 0, MUSIC_OFFSET);
    });
  }

  function initStars() {
    for (var i = 0; i < N_STARS; ++i) {
      stars.push(spawnStar());
    }
  }

  function init(canvas, volume) {
    initGraphics(canvas);
    initAudio(volume);
    initStars();
  }

  function resize() {
    gfx.canvas.width = window.innerWidth;
    gfx.canvas.height = window.innerHeight;
    size = [gfx.canvas.width, gfx.canvas.height];
    aspect = gfx.canvas.height / gfx.canvas.width;
    lineWidth = Math.floor(Math.max(1, size[0] * 0.002));
  }

  function wheel(ev) {
    var delta = VOLUME_TICK * Math.sign(ev.deltaY);
    setVolume(getVolume() - delta);
  }

  function mousemove(ev) {
    if (ev.clientX == null) {
      return;
    }

    parallax = [ev.clientX / gfx.canvas.width,
      ev.clientY / gfx.canvas.height]
      .clamp(0, 1)
      .multiplyScalar(PARALLAX_AMOUNT);
  }

  function updateAmplitude() {
    analyser.getByteTimeDomainData(soundBuffer);
    amplitude = soundBuffer.averageAmplitude(0, analyser.fftSize);
  }

  function updateFrequencies() {
    analyser.getByteFrequencyData(frequencyBuffer);

    var midStart = analyser.frequencyBinCount * MID_THRESHOLD;
    var highStart = analyser.frequencyBinCount * HIGH_THRESHOLD;
    midStart = Math.floor(midStart);
    highStart = Math.floor(highStart);

    var min = 255;
    var max = 0;

    for (var i = 0; i < analyser.frequencyBinCount; ++i) {
      min = Math.min(min, frequencyBuffer[i]);
      max = Math.max(max, frequencyBuffer[i]);
    }

    low = frequencyBuffer.average(0, midStart);
    mid = frequencyBuffer.average(midStart + 1, highStart);
    high = frequencyBuffer.average(highStart + 1,
      analyser.frequencyBinCount);

    low = (low - min) / (max - min);
    mid = (mid - min) / (max - min);
    high = (high - min) / (max - min);
  }

  function spawnStar() {
    return (
      [Math.random() - 0.5, Math.random() - 0.5, Math.random() + 0.25]
        .multiplyScalar(8)
    );
  }

  function updateStars() {
    stars = stars.map(
      function(star) {
        if (star[2] <= 0.2) {
          return spawnStar();
        }
        return star.subtract([0, 0, amplitude * 10 * deltaTime]);
      }
    );
  }

  function update() {
    if (audio) {
      updateAmplitude();
      updateFrequencies();
    }

    updateStars();

    rotation = addAngle(rotation, amplitude * Math.PI * deltaTime);
  }

  function drawBackground() {
    gfx.fillStyle = rgb(low * 30, high * 30, mid * 30);
    gfx.fillRect(0, 0, size[0], size[1]);
  }

  function drawStars() {
    gfx.fillStyle = '#FFFFFF';
    stars.forEach(
      function(star) {
        var size = 0.025 / star[2];
        var pos = star.add(parallax).divideScalar(star[2]);
        fillRect(pos[0] - size / 2, pos[1] - size / 2, size, size);
      }
    );
  }

  function drawCube() {
    gfx.lineWidth = lineWidth;
    gfx.strokeStyle = rgba(low * 255, mid * 128, high * 128,
      0.8 + amplitude);
    strokeCube(parallax[0], parallax[1], 4, 1 + amplitude,
      rotation, rotation * 0.75);
  }

  function draw() {
    drawBackground();
    drawStars();
    drawCube();
  }

  function tick() {
    var now = Date.now();
    deltaTime = (now - lastFrameTime) / 1000.0;
    lastFrameTime = now;

    update();
    draw();

    window.requestAnimationFrame(tick);
  }

  flashycubes.init = init;

  // --------------------------------------------------------------------

  function loadSound(url, loadedCallback) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
      audio.decodeAudioData(request.response, loadedCallback);
    };
    request.send();
  }

  function getVolume() {
    if (typeof(curVolume) === 'undefined') {
      return INITIAL_VOLUME;
    }
    return curVolume;
  }

  function setVolume(volume) {
    if (!audio) {
      return;
    }

    volume = Math.max(0, Math.min(1, volume));

    var gain = gainNode.gain;
    var cur = audio.currentTime;
    gain.linearRampToValueAtTime(getVolume(), cur);
    gain.linearRampToValueAtTime(volume, cur + VOLUME_FADE_TIME);

    if (typeof(Storage) !== 'undefined') {
      localStorage.setItem('volumeLevel', volume.toString());
    }

    curVolume = volume;
    updateVolume();
  }

  function updateVolume() {
    volumeDisplay.innerHTML = getVolume().toFixed(2).toString();
  }

  function playSound(buffer, when, offset) {
    var gain = initialGainNode.gain;
    var cur = audio.currentTime;
    gain.linearRampToValueAtTime(0, cur);
    gain.linearRampToValueAtTime(getVolume(), cur + FADE_TIME);

    var source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    source.loop = true;
    source.start(when, offset);

    return source;
  }

  // --------------------------------------------------------------------

  function addAngle(angle, delta) {
    var res = (angle + delta) % (2*Math.PI);
    return res < 0 ? res + 2*Math.PI : res;
  }

  function rgb(r, g, b) {
    return (
      'rgb(' +
      [r, g, b]
        .floor()
        .clamp(0, 255)
        .join(',') +
      ')'
    );
  }

  function rgba(r, g, b, a) {
    a = Math.max(0, Math.min(a, 1));
    return (
      'rgba(' +
      [r, g, b]
        .floor()
        .clamp(0, 255)
        .join(',') +
      ',' + a + ')'
    );
  }

  function pixels(coord) {
    return (
      coord
        .multiply(size)
        .multiplyScalar(0.5)
        .multiply([aspect, 1])
        .add(size.multiplyScalar(0.5))
    );
  }

  function fillRect(x, y, width, height) {
    var ltrb = pixels([x, y, x + width, y + height]);
    var lt = ltrb.slice(0, 2);
    var rb = ltrb.slice(2, 4);
    var xywh = lt.concat(rb.subtract(lt));
    gfx.fillRect.apply(gfx, xywh);
  }

  function lineTo(point) {
    gfx.lineTo.apply(gfx, pixels(point));
  }

  function moveTo(point) {
    gfx.moveTo.apply(gfx, pixels(point));
  }

  function rotatePoint(x, y, z, yaw, pitch) {
    var pitchSin = Math.sin(pitch);
    var pitchCos = Math.cos(pitch);
    var yawSin = Math.sin(yaw);
    var yawCos = Math.cos(yaw);
    var pitchz = z * pitchCos + (-y) * (-pitchSin);
    return [
      -(pitchz * yawSin + (-x) * yawCos),
      -(z * pitchSin + (-y) * pitchCos),
      pitchz * yawCos + (-x) * (-yawSin)
    ];
  }

  function transformPoints(points, x, y, z, scale, yaw, pitch) {
    return points.map(function(vert) {
      var t = vert.multiplyScalar(scale);
      t = rotatePoint(t[0], t[1], t[2], yaw, pitch)
        .add([x, y, z]);
      return t.divideScalar(t[2]);
    });
  }

  function strokeCube(x, y, z, scale, yaw, pitch) {
    var front = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
    ];

    var back = [
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ];

    front = transformPoints(front, x, y, z, scale, yaw, pitch);
    back = transformPoints(back, x, y, z, scale, yaw, pitch);

    gfx.beginPath();

    moveTo(front[0]);
    lineTo(front[1]);
    lineTo(front[2]);
    lineTo(front[3]);
    lineTo(front[0]);

    lineTo(back[0]);
    lineTo(back[1]);
    lineTo(back[2]);
    lineTo(back[3]);
    lineTo(back[0]);

    moveTo(back[1]);
    lineTo(front[1]);
    moveTo(back[2]);
    lineTo(front[2]);
    moveTo(back[3]);
    lineTo(front[3]);

    gfx.stroke();
  }

  // --------------------------------------------------------------------

  Array.prototype.zip = function(other, func) {
    return this.map(
      function(x, i) {
        return func(x, other[i % other.length], i);
      });
  };

  Array.prototype.addScalar = function(scalar) {
    return this.map(function(x) { return x + scalar; });
  };

  Array.prototype.multiplyScalar = function(scalar) {
    return this.map(function(x) { return x * scalar; });
  };

  Array.prototype.divideScalar = function(scalar) {
    return this.map(function(x) { return x / scalar; });
  };

  Array.prototype.add = function(other) {
    return this.zip(other, function(x, y) { return x + y; });
  };

  Array.prototype.subtract = function(other) {
    return this.zip(other, function(x, y) { return x - y; });
  };

  Array.prototype.multiply = function(other) {
    return this.zip(other, function(x, y) { return x * y; });
  };

  Array.prototype.floor = function() {
    return this.map(function(x) { return Math.floor(x); });
  };

  Array.prototype.clamp = function(min, max) {
    return this.map(
      function(x) {
        return Math.max(min, Math.min(x, max));
      });
  };

  if ('Uint8Array' in window) {
    var Uint8Array = window.Uint8Array;

    Uint8Array.prototype.average = function(start, end) {
      var res = 0;

      for (var i = start; i < end; ++i) {
        res += this[i];
      }

      if (end - start <= 0) {
        return 0;
      }

      return res / (end - start);
    };

    Uint8Array.prototype.averageAmplitude = function(start, end) {
      var res = 0;

      for (var i = start; i < end; ++i) {
        var value = this[i] / 128.0;
        value = Math.abs(value - 1);
        res += value;
      }

      if (end - start >= 1) {
        res /= end - start;
      } else {
        return 0;
      }

      return res;
    };
  }

  // --------------------------------------------------------------------
  // AudioContext polyfill
  // mostly copied from:
  // https://github.com/shinnn/AudioContext-Polyfill
  // https://gist.github.com/kus/3f01d60569eeadefe3a1

  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  var ctxProto = AudioContext.prototype;
  var tmpctx = new AudioContext();
  var bufProto = tmpctx.createBufferSource().constructor.prototype;

  function isOld(expected, old) {
    return expected === undefined && old !== undefined;
  }

  if (isOld(bufProto.start, bufProto.noteOn)) {
    var nativeCreateBufferSource = ctxProto.createBufferSource;

    ctxProto.createBufferSource = function createBufferSource() {
      var returnNode = nativeCreateBufferSource.call(this);
      returnNode.start = returnNode.start || returnNode.noteOn;
      return returnNode;
    };
  }

  if (isOld(ctxProto.createGain, ctxProto.createGainNode)) {
    ctxProto.createGain = ctxProto.createGainNode;
  }

  if (navigator.userAgent.indexOf('like Mac OS X') !== -1) {
    var OriginalAudioContext = AudioContext;
    window.AudioContext = function AudioContext() {
      var iOSCtx = new OriginalAudioContext();

      var body = document.body;
      var tmpBuf = iOSCtx.createBufferSource();
      var tmpProc = iOSCtx.createScriptProcessor(256, 1, 1);

      body.addEventListener('touchstart', instantProcess, false);

      function instantProcess() {
        tmpBuf.start(0);
        tmpBuf.connect(tmpProc);
        tmpProc.connect(iOSCtx.destination);
      }

      tmpProc.onaudioprocess = function() {
        tmpBuf.disconnect();
        tmpProc.disconnect();
        body.removeEventListener('touchstart', instantProcess, false);
        tmpProc.onaudioprocess = null;
      };

      return iOSCtx;
    };
  }

})();
