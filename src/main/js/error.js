/*
 * ERROR HANDLING UTILITY FUNCTIONS
 *
 */

/**
 * @module imscError
 */

/**
 * @param {ErrorHandler} errorHandler
 * @param {string} msg
 */
export function reportWarning(errorHandler, msg) {

  if (errorHandler && errorHandler.warn && errorHandler.warn(msg))
    throw msg;

}

/**
 * @param {ErrorHandler} errorHandler
 * @param {string} msg
 */
export function reportError(errorHandler, msg) {

  if (errorHandler && errorHandler.error && errorHandler.error(msg))
    throw msg;

}

/**
 * @param {ErrorHandler} errorHandler
 * @param {string} msg
 */
export function reportFatal(errorHandler, msg) {

  if (errorHandler && errorHandler.fatal)
    errorHandler.fatal(msg);

  throw msg;

}

/**
 * Generic interface for handling events. The interface exposes four
 * methods:
 * - <pre>info</pre>: unusual event that does not result in an inconsistent state
 * - <pre>warn</pre>: unexpected event that should not result in an inconsistent state
 * - <pre>error</pre>: unexpected event that may result in an inconsistent state
 * - <pre>fatal</pre>: unexpected event that results in an inconsistent state
 *   and termination of processing
 * Each method takes a single <pre>string</pre> describing the event as argument,
 * and returns a single <pre>boolean</pre>, which terminates processing if <pre>true</pre>.
 *
 * @typedef {Object} ErrorHandler
 * @property {(msg: string) => boolean} warn
 * @property {(msg: string) => boolean} error
 * @property {(msg: string) => boolean} fatal
 */
