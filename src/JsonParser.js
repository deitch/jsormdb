/**
 * @author Avi Deitcher
 * @fileOverview JSON Parser to convert JSON into objects suitable for jsormdb and vice-versa
 */
/*global JSORM */
/**
 * Create a new JSON parser
 * @class Parser to convert JSON into objects when loaded from a channel and vice-versa
 * 
 * @param {Object} [config] Configuration parameters
 * @param {String} [config.id] Default field to use as the unique identifier field in parsed data
 * @param {String} [config.root] Default element to use as the root of actual records in parsed data
 */
JSORM.db.parser.json = JSORM.extend({}, function(config){
	config = config || {};
	var id = config.id, root = config.root, lastMeta = {}, lastRoot = {};
	
	// read - input JSON, write out objects
	JSORM.apply(this, /** @lends JSORM.db.parser.json.prototype */{
		/**
		 * Convert JSON into an object structure suitable to load into jsormdb
		 * 
		 * @param {String} json JavaScript Object Notation string with the appropriate information
		 * @returns {Object} An object with the appropriate elements
		 */
		read : function(json) {
			// first parse the data
			var data = null, p;
			p = JSON.parse(json);

			// data better be a valid object
			if (p && typeof(p) === "object") {
				data = {};
				// if it is an array, just use it directly 
				if (p.isArray) {
					data.records = p;
					data.id = id;
				} else {
					// find out our root and our id
					root = p.meta && p.meta.root ? p.meta.root : root;
					data.records = p[root];
					data.id = p.meta && p.meta.id ? p.meta.id : id;

					// keep the root information
					lastMeta = p.meta;
					lastRoot = root;
				}
			}

			return(data);
		},

		/**
		 * Convert an array of jsormdb objects into JSON as per the original load structure
		 * 
		 * @param {Object[]} records Array of records from a jsormdb database
		 * @returns {String} JSON-encoded String, including appropriate metadata and root
		 */
		write : function(records) {
			// hold our new structure
			var obj = {};
			obj[lastRoot] = records;
			if (lastMeta) {
				obj.meta = lastMeta;
			}
			var j = JSON.stringify(obj);
			if (!j) {throw{message: "JsonParser.write: unable to encode records into Json"};}
			return(j);
		}		
	});
});
