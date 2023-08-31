     _                                 _    _____ 
    (_)                               | |  / ____|
     _   _ __ ___    ___    ___       | | | (___  
    | | | '_ ` _ \  / __|  / __|  _   | |  \___ \ 
    | | | | | | | | \__ \ | (__  | |__| |  ____) |
    |_| |_| |_| |_| |___/  \___|  \____/  |_____/ 
                                                  
                                  
                                  
INTRODUCTION
============

imscJS is a JavaScript library for rendering [IMSC 1.0.1](https://www.w3.org/TR/ttml-imsc1.0.1/) and [IMSC 1.1](https://www.w3.org/TR/ttml-imsc1.1/) documents to HTML5. IMSC is a profile of [TTML 2](https://www.w3.org/TR/ttml2/) designed for subtitle and caption delivery worldwide.

A sample web app that uses imscJS is available at https://www.sandflow.com/imsc1_1/index.html.

Documentation is available on [MDN](https://developer.mozilla.org/en-US/docs/Related/IMSC).



KNOWN ISSUES AND LIMITATIONS
============================

imscJS is primarily developed on Firefox. Latest versions of Chrome, Safari, and Microsoft Edge are intended to be supported nevertheless, albeit with potentially reduced capabilities. In particular, advanced ruby layout is currently only supported by Firefox.

imscJS is intended to reflect the most recent published versions of [IMSC 1.0.1](https://www.w3.org/TR/ttml-imsc1.0.1/) and [IMSC 1.1](https://www.w3.org/TR/ttml-imsc1.1/). These publications are routinely clarified by proposed resolutions to issues captured in their respective bug trackers.

imscJS bugs are tracked at https://github.com/sandflow/imscJS/issues.



RUNTIME DEPENDENCIES
====================

(required) [sax-js 1.2.1](https://www.npmjs.com/package/sax)

Rendering to HTML5 requires a browser environment, but parsing an IMSC document and transforming it into ISDs does not.



DEVELOPMENT DEPENDENCIES
========================

(required) node.js (see [package.json](package.json) for a complete list of dependencies)

(recommended) git



QUICK START
===========

* run the `build` target defined in [Gruntfile.js](Gruntfile.js) using [grunt](http://gruntjs.com/).

* the resulting `imsc.js` and `sax.js` files at `build/public_html/libs` are, respectively, the imscJS library and its sax-js dependency. For example, both libraries can be included in a web page as follows:

```html
    <script src="libs/sax.js"></script>
    <script src="libs/imsc.js"></script>
```

See BUILD ARTIFACTS for a full list of build artifacts, and TESTS AND SAMPLES for a list of samples and tests available.



ARCHITECTURE
============

API
---

imscJS renders an IMSC document in three distinct steps:

* `fromXML(xmlstring, errorHandler, metadataHandler)` parses the document and returns a TT object. The latter contains opaque representation of the document and exposes the method `getMediaTimeEvents()` that returns a list of time offsets (in seconds) of the ISD, i.e. the points in time where the visual representation of the document change.

* `generateISD(tt, offset, errorHandler)` creates a canonical representation of the document (provided as a TT object generated by `fromXML()`) at a point in time (`offset` parameter). This point in time does not have to be one of the values returned by `getMediaTimeEvents()`. For example, given an ISOBMFF sample covering the interval `[a, b[`, `generateISD(tt, offset, errorHandler)` would be called first with `offset = a`, then in turn with offset set to each value of `getMediaTimeEvents()` that fall in the interval `]a, b[`.

* `renderHTML(isd, element, imgResolver, eheight, ewidth, displayForcedOnlyMode, errorHandler, previousISDState, enableRollUp)` renders an `isd` object returned by `generateISD()` into a newly-created `div` element that is appended to the `element`. The `element` must be attached to the DOM. The height and width of the child `div` element are equal to `eheight` and `ewidth` if not null, or `clientWidth` and `clientHeight` of the parent `element` otherwise. Images URIs specified in `smpte:background` attributes are mapped to image resource URLs by the `imgResolver` function. The latter takes the value of the `smpte:background` attribute URI and an `img` DOM element as input and is expected to set the `src` attribute of the `img` DOM element to the absolute URI of the image. `displayForcedOnlyMode` sets the (boolean) value of the IMSC displayForcedOnlyMode parameter. `enableRollUp` enables roll-up as specified in CEA 708. `previousISDState` maintains states across calls, e.g. for roll-up processing.

In each step, the caller can provide an `errorHandler` to be notified of events during processing. The `errorHandler` may define four methods: `info`, `warn`, `error` and `fatal`. Each is called with a string argument describing the event, and will cause processing to terminate if it returns `true`.

Inline documentation provides additional information.


MODULES
-------

imscJS consists of the following modules, which can be used in a node 
environment using the `require` functionality, or standalone, in which case each module hosts its 
definitions under a global name (the token between parantheses):

* `doc.js` (`imscDoc`): parses an IMSC document into an in-memory TT object
* `isd.js` (`imscISD`): generates an ISD object from a TT object
* `html.js` (`imscHTML`): generates an HTML fragment from an ISD object
* `names.js` (`imscNames`): common constants
* `styles.js` (`imscStyles`): defines TTML styling attributes processing
* `utils.js` (`imscUtils`): common utility functions



BUILD
=====

imscJS is built using the `build:release` or `build:debug` Grunt tasks -- the `build` task is an alias of `build:debug`.

The `dist` directory contains the following build artifacts:
* `imsc.all.debug.js`: Non-minified build that includes the sax-js dependency.
* `imsc.all.min.js`: Minified build that includes the sax-js dependency.
* `imsc.debug.js`: Non-minified build that does not include the sax-js dependency.
* `imsc.min.js`: Minified build that does not include the sax-js dependency.

The `build/public_html/libs/imsc.js` files is identical to:
* `imsc.debug.js`, if the `build:debug` task is executed.
* `imsc.min.js`, if the `build:release` task is executed.



RELEASES
========

imscJS is released as an NPM package under [imsc](https://www.npmjs.com/package/imsc). The `dev` distribution tag indicates pre-releases.

Builds/dist are available on the [unpkg](https://unpkg.com/) CDN under the [`dist`](https://unpkg.com/browse/imsc/dist/) directory.

To get access the latest builds, go the [release page](https://github.com/sandflow/imscJS/releases).



TESTS AND SAMPLES
=================


W3C Test Suite
--------------

imscJS imports the [IMSC test suite](https://github.com/w3c/imsc-tests) as a submodule at `src/test/resources/imsc-tests`. The gen-renders.html web app can be used to generate PNG renderings as as well intermediary files from these tests.


Unit tests
----------

Unit tests run using [QUnit](https://qunitjs.com/) are split between:

* [src/test/webapp/js/unit-tests.js](src/test/webapp/js/unit-tests.js)
* [src/test/js](src/test/js)


NOTABLE DIRECTORIES AND FILES
=============================

* [package.json](package.json): NPM package definition

* [Gruntfile.js](Gruntfile.js): Grunt build script

* [properties.json](properties.json): General project properties

* [LICENSE](LICENSE): License under which imscJS is made available

* [src/main/js](src/main/js): JavaScript modules

* [src/test](src/test): Test files

* [dist](dist): Built libraries

* [build/public_html](build/public_html): Test web applications
