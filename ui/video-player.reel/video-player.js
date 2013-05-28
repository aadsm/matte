"use strict";
/**
    @module montage/ui/video-player
    @requires montage
    @requires montage/ui/component
    @requires core/logger
    @requires core/event/action-event-listener
    @requires core/media-controller
*/
var Montage = require("montage").Montage,
    Bindings = require("montage/core/bindings").Bindings,
    Component = require("montage/ui/component").Component,
    logger = require("montage/core/logger").logger("video-player"),
    ActionEventListener = require("montage/core/event/action-event-listener").ActionEventListener,
    MediaController = require("montage/core/media-controller").MediaController,
    Converter = require("montage/core/converter/converter").Converter;

exports.PrettyTimeConverter = Montage.create(Converter, {
    convert: {
        value: function(time) {
            var sec, min, hour;
            time = parseInt(time, 10);
            if (isNaN(time) || time < 0)
                return "";
            sec = time % 60;
            min = Math.floor(time / 60) % 60;
            hour = Math.floor(time / 3600);
            return (hour > 0 ? hour + ":" : "") + (min < 10 ? "0"+min : min) + ":" + (sec < 10 ? "0"+sec : sec);
        }
    },
    revert: {
        value: function(value) {
            return value;
        }
    }
});

/**
 @class module:matte/ui/video-player.VideoPlayer
 */
var VideoPlayer = exports.VideoPlayer = Montage.create(Component,/** @lends module:matte/ui/video-player.VideoPlayer# */ {

    /*-----------------------------------------------------------------------------
    MARK:   Constants
    -----------------------------------------------------------------------------*/
/**
    The interval in milliseconds that the control panel is displayed without interaction before being hidden.
    @type {number}
    @default 5000
*/
    CONTROL_SHOW_TIME: { enumerable: true, value: 5000, writable: false },
    /*-----------------------------------------------------------------------------
    MARK:   Element Getters
    -----------------------------------------------------------------------------*/
    /**
        The DIV element used to display the play button in the media controller.
        @type {external:Element}
        @default null
    */
    playButton: { value: null, enumerable: false },

    /**
        The DIV element used to display the repeat button in the media controller.
        @type {external:Element}
        @default null
    */
    repeatButton: { value: null, enumerable: false },

    /**
        The DIV element used to display the volume level in the media controller.
        @type {external:Element}
        @default null
    */
    volumeLevel: { value: null, enumerable: false },

    /**
        The DIV element used to display the volume level in the media controller.
        @type {external:Element}
        @default null
    */
    controls: { value: null, enumerable: false },

    /**
        The DIV element used to display the  in the media controller.
        @type {external:Element}
        @default null
    */
    fullScreenPanel: { value: null, enumerable: false },
    /**
        Description TODO
        @type {external:Element}
        @default null
    */
    fullScreenButton: { value: null, enumerable: false },

    /*-----------------------------------------------------------------------------
    MARK:   Component References
    -----------------------------------------------------------------------------*/
    /**
        The Text component used to display the currently playing track's playback position.
        @type {module:montage/ui/text.Text}
        @default null
    */
    positionText: { value: null, enumerable: false },     /* montage/ui/text */

    /**
        The Text component used to display the currently playing track's duration.
        @type {module:montage/ui/text.Text}
        @default null
    */
    durationText: { value: null, enumerable: false },     /* montage/ui/text */

    /**
        The Slider component used to control the playback position.
        @type {module:montage/ui/slider.Slider}
        @default null
    */
    slider: { value: null, enumerable: false },           /* montage/ui/slider */
    /*-----------------------------------------------------------------------------
    MARK:   Properties
    -----------------------------------------------------------------------------*/
    
    _controller: {
        value: null
    },
    
    /**
        The MediaController instance used by the VideoPlayer.
        @type {module:montage/core/media-controller.MediaController}
        @default null
    */
    controller: {
        get: function() {
            return this._controller;
        },
        set: function(controller) {
            if (controller) {
                this._controller = controller;
                if (this.mediaElement) {
                    this.mediaElement.controller = controller.mediaController;
                }
            }
        }
    },

    /**
    @private
    */
    _src: {
        value: null
    },
    /**
     * @type {String}
     * @default null
     */
    src: {
        get: function() {
            return this._src;
        },
        set: function(src) {
            this._src = src;
        }
    },
    
    /**
    @private
    */
    _sources: {
        value: null
    },
    /**
     * @type {Array}
     * @default null
     */
    sources: {
        get: function() {
            return [];
        },
        set: function(sources) {
            if (sources && sources.length) {
                var mediaElement = document.createElement("video");
                for (var i=0;i<sources.length;i++) {
                    var mediaSrc = sources[i].src,
                        mediaType = sources[i].type;
                    if (mediaType && mediaElement.canPlayType(mediaType)) {
                        this.src = mediaSrc;
                        break;
                    }
                }
                this._sources = sources;
            }
        }
    },

    /**
      @private
    */
    _posterSrc: {
        value: null
    },
    /**
     * @type {String}
     * @default null
     */
    posterSrc: {
        get: function() {
            return this._posterSrc;
        },
        set: function(posterSrc) {
            this._posterSrc = posterSrc;
        }
    },
    
    /*-----------------------------------------------------------------------------
    MARK:   Event Handlers
    -----------------------------------------------------------------------------*/
    
    handlePlayButtonAction: {
        value: function() {
            if (this.controller.status === this.controller.PLAYING) {
                this.controller.pause();
            } else if (this.controller.status === this.controller.PAUSED) {
                this.controller.unpause();
            } else {
                this.controller.play();
            }
        }
    },
    
    handleRewindButtonAction: {
        value: function() {
            this.controller.rewind();
        }
    },
    
    handleFastForwardButtonAction: {
        value: function() {
            this.controller.fastForward();
        }
    },
    
    handleDecreaseVolumeButtonAction: {
        value: function() {
            this.controller.volumeDecrease();
        }
    },
    
    handleIncreaseVolumeButtonAction: {
        value: function() {
            this.controller.volumeIncrease();
        }
    },

    handleMuteButtonAction: {
        value: function() {
            this.controller.toggleMute();
        }
    },
    
    handleRepeatButtonAction: {
        value: function() {
            // TODO
        }
    },
    
    handleFullScreenButtonAction: {
        value: function() {
            this.toggleFullScreen()
        }
    },
    
    /*-----------------------------------------------------------------------------
    MARK:   UI Setters
    -----------------------------------------------------------------------------*/
    /**
        Determines whether video controls are hidden automatically.
        @type {Boolean}
        @default true
    */
    autoHide: { value: true },

    /**
        Specifies whether the full screen video is supported.
        @type {Boolean}
        @default true
    */
    supportsFullScreen: { value: true },

    /**
    @private
    */
    _isFullScreen: { value: false },

    templateDidLoad: {
        value: function() {
            if(logger.isDebug) {
                logger.debug("VideoPlayer:templateDidLoad");
            }
        }
    },
    
    /**
    Description TODO
    @function
    @private
    */
    handleMediaStateChange: {
        value: function() {
            this.needsDraw = true;
        }
    },
    /*-----------------------------------------------------------------------------
    MARK:   Interaction
    -----------------------------------------------------------------------------*/
    /**
    Description TODO
    @private
    */
    _showControls: {
        value: true, enumerable: false
    },
    /**
    Description TODO
    @private
    */
    _hideControlsId: {
        value: null, enumerable: false
    },
    /**
    Description TODO
    @function
    @private
    */
    handleMouseup: {
        value: function() {
            this.showControlsForInterval();
        }
    },
    /**
    Description TODO
    @function
    @private
    */
    handleTouchend: {
        value: function() {
            this.showControlsForInterval();
        }
    },
    /**
    Displays the video player controlls for the interval specified by the CONTROL_SHOW_TIME property.
    @function
    */
    showControlsForInterval: {
        value: function() {
            this._showControls = true;
            this.needsDraw = true;

            var self = this;
            var hideControls = function() {
                self._showControls = false;
                self._hideControlsId = null;
                self.needsDraw = true;
            }

            if (this._hideControlsId) {
                window.clearTimeout(this._hideControlsId);
            }
            this._hideControlsId = window.setTimeout(hideControls, this.CONTROL_SHOW_TIME);
        }
    },


    /**
    @function
    */
    loadMedia: {
        value: function() {
            if (logger.isDebug) {
                logger.debug("VideoPlayer:loadMedia");
            }
            this.mediaElement.src = this.src;
            this.mediaElement.load();
        }
    },

    /**
    @function
    */
    showPoster: {
        value: function() {
            if (this.posterSrc) {
                this.mediaElement.poster = this.posterSrc;
            }
        }
    },

    /**
    Toggles full-screen playback mode.
    @function
    */
    toggleFullScreen: {
        value: function() {
            if (this.supportsFullScreen) {
                this._isFullScreen = !this._isFullScreen;
                if (!this._isFullScreen) {
                    if (this.element.webkitExitFullscreen) {
                        this.element.webkitExitFullscreen();
                    } else if (this.element.webkitCancelFullScreen) {
                        this.element.webkitCancelFullScreen();
                    }
                } else {
                    if (this.element.webkitEnterFullScreen) {
                        this.element.webkitEnterFullScreen();
                    } else if (this.element.webkitRequestFullScreen) {
                        this.element.webkitRequestFullScreen();
                    }
                }
                this.needsDraw = true;
            }
        }
    },
    
    /**
    @private
    */
    _installMediaEventListeners: {
        value: function() {
            this.controller.addEventListener("mediaStateChange", this, false);
        }
    },
    /**
    @private
    */
    _installUserActionDetector: {
        value: function() {
            if (window.touch && this.autoHide) {
                this.element.addEventListener("touchstart", this, false);
            } else if (this.autoHide) {
                this.element.addEventListener("mouseup", this, false);
            }
        }
    },
    /**
    @private
    */
    enterDocument: {
        value: function(firstTime) {
            if (firstTime) {
                // look for src attribute on original element
                if (this.originalElement.hasAttribute("src") && this.originalElement.getAttribute("src")) {
                    this.src = this.originalElement.getAttribute("src");
                } else {
                    // try to grab <source> child elements from original element
                    var sources = this.originalElement.getElementsByTagName("source"),
                        mediaSrc, mediaType;
                    for (var i=0;i<sources.length;i++) {
                        mediaSrc = sources[i].getAttribute("src");
                        mediaType = sources[i].getAttribute("type");
                        if (mediaType && !this.originalElement.canPlayType(mediaType)) {
                            continue;
                        }
                        this.src = mediaSrc;
                        break;
                    }
                }
                
                // try to grab <track> child elements from original element
                var tracks = this.originalElement.getElementsByTagName("track");
                for (var i=0;i<tracks.length;i++) {
                    var trackKind = tracks[i].getAttribute("kind");
                    if (trackKind == "captions" || trackKind == "subtitles") {
                        var track = document.createElement("track");
                        track.kind = trackKind;
                        track.label = tracks[i].getAttribute("label");
                        track.src = tracks[i].getAttribute("src");
                        track.srclang = tracks[i].getAttribute("srclang");
                        track.default = tracks[i].hasAttribute("default");
                        this.mediaElement.appendChild(track);
                        this.mediaElement.textTracks[this.mediaElement.textTracks.length-1].mode = "showing";
                    }
                }

                if (!this.controller) {
                    this.controller = Montage.create(MediaController);
                }
                this.mediaElement.controller = this.controller.mediaController;

                this._installUserActionDetector();
                this._installMediaEventListeners();

                if (!this.autoHide) {
                    this.element.style.paddingBottom = "50px";
                }
            }
        }
    },

    /**
    @private
    */
    draw: {
        value: function() {
            var volumeWidth;
            // Handle loading
            if (this.controller.status === this.controller.EMPTY) {
                this.loadMedia();
            } else {
                // Handle playing
                if (this.controller.status === this.controller.PLAYING) {
                    if (!this.playButton.classList.contains('playing')) {
                        this.playButton.classList.add('playing');
                    }
                } else {
                    if (this.playButton.classList.contains('playing')) {
                        this.playButton.classList.remove('playing');
                    }
                }

                if (this.volumeLevel) {
                    volumeWidth = Math.floor(this.controller.volume);
                    this.volumeLevel.style.width =  volumeWidth + "%";
                }

                if (this.controller.repeat) {
                    if (!this.repeatButton.classList.contains("loop")) {
                        this.repeatButton.classList.add("loop");
                    }
                } else {
                    if (this.repeatButton.classList.contains("loop")) {
                        this.repeatButton.classList.remove("loop");
                    }
                }

                if (this._showControls) {
                    this.controls.classList.remove("hide-controls");
                    this.controls.classList.add("show-controls");
                } else {
                    this.controls.classList.remove("show-controls");
                    this.controls.classList.add("hide-controls");
                }

                if (this.supportsFullScreen) {
                    this.fullScreenPanel.classList.add("support-fullscreen");
                    this.fullScreenPanel.classList.remove("hide-fullscreen");
                    if (!this._isFullScreen) {
                        this.fullScreenButton.classList.add("enter-fullscreen");
                        this.fullScreenButton.classList.remove("exit-fullscreen");
                        this.element.classList.remove("fullscreen");
                    } else {
                        this.fullScreenButton.classList.add("exit-fullscreen");
                        this.fullScreenButton.classList.remove("enter-fullscreen");
                        this.element.classList.add("fullscreen");
                    }
                } else {
                    this.fullScreenPanel.classList.remove("support-fullscreen");
                    this.fullScreenPanel.classList.add("hide-fullscreen");
                    this.element.classList.remove("fullscreen");
                }
            }
        }
    }
});
