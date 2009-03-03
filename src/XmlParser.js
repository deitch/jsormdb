/**
 * @author Avi Deitcher
 * @fileOverview XML Parser for jsormdb - NOT YET READY!!
 */
/*global JSORM */

/**
 * Create a new XML parser
 * @class XML Parser for jsormdb - NOT YET READY!!
 * 
 * @param {Object} [config] Configuration parameters
 * @param {String} [config.id] Default field to use as the unique identifier field in parsed data
 * @param {String} [config.root] Default element to use as the root of actual records in parsed data
 */
JSORM.db.parser.XmlParser = JSORM.extend({}, function(config){
	var meta = config.meta || {};
	var lastMeta = {}, lastRoot = {};
	
	JSORM.apply(this,/** @lends JSORM.db.parser.XmlParser */{
		/**
		 * Convert XML into an object structure suitable to load into jsormdb
		 * 
		 * @param {Object} xml XML converted into a structured document object, normally by the browser. In the case
		 *    of Ajax, this is normally provided by response.responseXml
		 * @returns {Object} An object with the appropriate elements
		 */
		read : function(xml) {
			// first parse the data
			var data = null, e, p, recs;

			// get the document root, if available
			root = xml.documentElement || xml;

			// get the data and meta data
			meta = root.getElementsByTagName("meta")[0];

			p = JSON.parse(json);

			// data better be a valid object
			if (p && typeof(p) === "object") {
				data = {};
				// if it is an array, just use it directly 
				if (p.isArray) {
					data.records = p;
					data.id = meta.id;
				} else {
					// find out our root and our id
					root = p.meta && p.meta.root ? p.meta.root : meta.root;
					data.records = p[root];
					data.id = p.meta && p.meta.id ? p.meta.id : meta.id;

					// keep the root information
					lastMeta = p.meta;
					lastRoot = root;
				}
			}

			return(data);
		},

		/**
		 * Convert an array of jsormdb objects into XML as per the original load structure
		 * 
		 * @param {Object[]} records Array of records from a jsormdb database
		 * @returns {String} XML-encoded String, including appropriate metadata and root
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

