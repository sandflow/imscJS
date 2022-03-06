
/**
 * @classdesc Generic interface for handling events. The interface exposes four
 * methods:
 * * <pre>info</pre>: unusual event that does not result in an inconsistent state
 * * <pre>warn</pre>: unexpected event that should not result in an inconsistent state
 * * <pre>error</pre>: unexpected event that may result in an inconsistent state
 * * <pre>fatal</pre>: unexpected event that results in an inconsistent state
 *   and termination of processing
 * Each method takes a single <pre>string</pre> describing the event as argument,
 * and returns a single <pre>boolean</pre>, which terminates processing if <pre>true</pre>.
 * @interface
 */
class ErrorHandler {

    /**
     * unusual event that does not result in an inconsistent state
     * @param {unknown} msg
     * @returns {boolean}
     */
    info(msg) { this._noop(msg); }

    /**
     * unexpected event that should not result in an inconsistent state
     * @param {unknown} msg
     * @returns {boolean}
     */
    warn(msg) { this._noop(msg); }

    /**
     * unexpected event that may result in an inconsistent state
     * @param {unknown} msg
     * @returns {boolean}
     */
    error(msg) { this._noop(msg); }

    /**
     * unexpected event that results in an inconsistent state
     *   and termination of processing
     * @param {unknown} msg
     * @returns {boolean}
     */
    fatal(msg) { this._noop(msg); }

    /**
     * A method to trick eslint no-unused-vars check for this interface
     * @private
     */
    _noop(msg) { return msg; }
}


/*
 * ERROR HANDLING UTILITY FUNCTIONS
 *
 */

function reportInfo(errorHandler, msg) {

    if (errorHandler && errorHandler.info && errorHandler.info(msg))
        throw msg;

}

function reportWarning(errorHandler, msg) {

    if (errorHandler && errorHandler.warn && errorHandler.warn(msg))
        throw msg;

}

function reportError(errorHandler, msg) {

    if (errorHandler && errorHandler.error && errorHandler.error(msg))
        throw msg;

}

function reportFatal(errorHandler, msg) {

    if (errorHandler && errorHandler.fatal)
        errorHandler.fatal(msg);

    throw msg;

}

module.exports = {
    reportInfo,
    reportWarning,
    reportError,
    reportFatal,
    ErrorHandler // just an interface, though
};
