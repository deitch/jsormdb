/**
 * @author Avi Deitcher
 * @fileOverview Channel to read/write from an HTTP server
 */
/*global j, JSORM */

/**
 * Create new HTTP channel
 * @class Channel to communicate over http via Ajax with the back-end server.
 * 
 * @param {Object} config Configuration object, must have at least one url parameter
 * @param {String} config.url URL to use for loading and updating. If it begins with '/', then absolute, else relative.
 * @param {String} config.loadUrl URL to use for loading. If it begins with '/', then absolute, else relative.
 * @param {String} config.updateUrl URL to use for updating. If it begins with '/', then absolute, else relative.
 */
j.db.channel.http = JSORM.extend({}, function(config){
	config = config || {};
	// convenience
	var ajax = JSORM.ajax, fork = JSORM.fork, that = this, processResponse, updateResponse, loadResponse, message,
	
	// our URLs; if only one url is given, use it for both
	loadUrl = config.loadUrl || config.url, updateUrl = config.updateUrl || config.url;

	// create event-handling
	JSORM.eventualize(this);
	this.events('beforeupdate','update','updateexception','beforeload','load','loadexception');

	processResponse = function(eSuccess, eFailure, filename, xhr, success, o) {
		var e, a, s, ct, ct2, res;
		if (success) {
			e = eSuccess; a = o.options; s = true;
			// because both types are sometimes used
			ct = xhr.getResponseHeader("Content-type");
			ct2 = xhr.getResponseHeader("Content-Type");
			res = ct === "text/xml" || ct2 === "text/xml" ? xhr.responseXML : xhr.responseText;
		} else {
			e = eFailure; a = xhr; s = false;
		}
		that.fire(e,o);
		o.callback.call(o.scope,{options: o.arg, success: s, response: res});		
	};
	
	updateResponse = function(filename, xhr, success, o){
		processResponse("update","updateexception",filename,xhr,success,o);
	};

	loadResponse = function(filename, xhr, success, o){
		processResponse("load","loadexception",filename,xhr,success,o);
	};
	
	message = function(beforeevent, arg, callback, method, url) {
		var params = arg.params, cb = arg.callback, scope = arg.scope, options = arg.options, o;
        if(that.fire("beforeevent", params) !== false){
            o = {
                params : params || {},
                options: {
                    callback : cb,
                    scope : scope,
                    arg : options
                },				
                callback : callback,
				method: method,
                scope: this,
				url: url
            };
            ajax(o);
        }else{
			fork({fn: cb, scope: scope || that, arg: [{options: options, success: false}]});
        }		
	};
	
	JSORM.apply(this,/** @lends JSORM.db.channel.http.prototype */{
		/**
		 * Update the remote data source via http. This is presumed to be asynchronous, and thus will
		 * return before the call is complete. Use a callback to capture the result.
		 * 
		 * @param {Object} [config] Configuration information for the update
		 * @param {Object} [config.params] Parameters to add to the update. Each element is given as a parameter name to the HTTP
     *    PUT, while the values are expected to be Strings given as the value of HTTP parameter 
     * @param {Function} [config.callback] Function to be executed when the update is complete, whether success or failure.
		 *   The callback should expect a single argument, an object, with the following elements:
		 *    <ul>
		 *     <li>success: boolean as to whether or not the update succeeded</li>
		 *     <li>options: the options that were passed to update as config.options</li>
		 *    </ul>
		 * @param {Object} [config.scope] Scope within which to execute the callback
		 * @param {Object} [config.options] Options to pass to the callback
		 */
	    update : function(arg){
			message("beforeupdate",arg,updateResponse, "POST", updateUrl);
		},
	
		/**
		 * Load from the remote data source via http. This is presumed to be asynchronous, and thus will
		 * return before the call is complete. Use a callback to capture the result.
		 * 
		 * @param {Object} [config] Configuration information for the load
		 * @param {Object} [config.params] Parameters to add to the load. Each element is given as a parameter name to the HTTP
		 *  GET, while the values are expected to be Strings given as the value of HTTP parameter 
		 * @param {Function} [config.callback] Function to be executed when the load is complete, whether success or failure.
		 *   The callback should expect a single argument, an object, with the following elements:
		 *    <ul>
		 *     <li>success: boolean as to whether or not the load succeeded</li>
		 *     <li>options: the options that were passed to load as config.options</li>
		 *    </ul>
		 * @param {Object} [config.scope] Scope within which to execute the callback
		 * @param {Object} [config.options] Options to pass to the callback
		 */
		load : function(arg) {
			message("beforeload",arg,loadResponse, "GET", loadUrl);
		}

	});

});

