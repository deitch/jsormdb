/**
 * @author adeitcher
 * @fileOverview Parser to convert objects into objects, essentially making no translation. Because
 * the database must have a parser for other conversions, e.g. JSON and XML, we need an object parser as well, especially
 * when the channel talks to some other object generator.
 */
/*global JSORM */

/**
 * Create a new object parser
 * 
 * @class Parser to convert objects into objects, essentially making no translation. Because
 * the database must have a parser for other conversions, e.g. JSON and XML, we need an object parser as well, especially
 * when the channel talks to some other object generator.
 */
JSORM.db.parser.object = JSORM.extend({}, function(){
	var clone = JSORM.clone;
	
	JSORM.apply(this,/** @lends JSORM.db.parser.object.prototype */{
		/**
		 * Convert raw JavaScript object records into a structure appropriate for consumption by jsormdb
		 * 
		 * @param {Object[]} data Array of objects
		 * @returns {Object} Object data structure with the original data cloned and loaded
		 */
	    read : function(data){
			data = [].concat(clone(data,true));
			// return an object as expected
		    return {
		        records : data
		    };
	    },

		/**
		 * Convert jsormdb internal records into JavaScript objects. This method does almost nothing, just clones the 
		 * objects and passed them back.
		 * 
		 * @param {Object[]} records Records from a jsormdb
		 * @returns {Object[]} Cloned records
		 */
		write : function(records) {
			// clone so we do not confuse objects
			return(clone(records,true));
		}		
	});
});


