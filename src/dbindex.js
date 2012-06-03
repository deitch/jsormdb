/**
 * @author adeitcher
 * @fileOverview Indexes for jsormdb. Currently provides only in-memory hash
 */
/*global j, JSORM */

/** 
* Create new JSORM.db.index.hash
 * @class Hash-based in-memory index for a database table. Supports only equals matches. For < <= > >= starts, use a B-tree.
 * 
 * @param {String|String[]} fields Single name of field or array of field names to initially index. Can be changed later.
 */
j.db.index.hash = JSORM.extend({},function(f) {
	this.type = "hash";
	var fields = 0, data = {};
	
	JSORM.apply(this,/** @lends JSORM.db.index.hash.prototype */{
		/**
		 * Add fields to the index. If the field is already indexed, do nothing.
		 * 
		 * @param {String|String[]} f Name or array of names of fields to index
		 */
		fields : function(f) {
			var i, len;
			if (f) {
				f = [].concat(f);
				for (i=0,len=f.length; i<len; i++) {
					// only need to register it if it is a string and we do not yet have it
					if (typeof(f[i]) === "string" && !data.hasOwnProperty(f[i])) {
						data[f[i]] = {};
						fields++;
					}
				}
			}
		},

		/**
		 * Remove fields from the index. If the field is not indexed, do nothing.
		 * 
		 * @param {String|String[]} f Name or array of names of fields to remove from the index
		 */
		unfields : function(f) {
			var i, len;
			if (f) {
				f = [].concat(f);
				for (i=0,len=f.length; i<len; i++) {
					// only need to unregister it if it is a string and we already have it
					if (typeof(f[i]) === "string" && data.hasOwnProperty(f[i])) {
						delete data[f[i]];
						fields--;
					}
				}
			}
		},

		/**
		 * Add one or more records to the index, including the location where they are located. The location
		 * is expected to be internal to the table engine implementation and have no meaning outside of that engine.
		 * 
		 * @param {Array} index Array of internal location reference pointers for the added records
		 * @param {Object[]} records Full set of records to index. This array must be precisely the same length as the index
		 *   array.
		 */
		add : function(index, records) {
			var i,j,len, ci, dj, rij;
			// add to the index only if something has been indexed
			if (fields > 0) {
				// work as an array
				records = [].concat(records);
				index = [].concat(index);
				// go through each indexed field, for each record
				for (i=0, len=records.length; i<len; i++) {
					ci = index[i];
					for (j in data) {
						// if this is a property in the index data, and it exists on the record, record it
						if (data.hasOwnProperty(j) && records[i].hasOwnProperty(j)) {
							dj = data[j]; rij = records[i][j];
							dj[rij] = dj[rij] || [];
							dj[rij].push(ci);
						}
					}
				}
			}

		},

		/**
		 * Remove single record from the index, either by index or by record. First preference is record, if blank then index.
		 * 
		 * @param {Object} index Indexed location, internal to the storage engine
		 * @param {Object} record Actual record to remove
		 */
		remove : function(index, record) {
			var j;
			// first try by record
			for (j in data) {
				if (data.hasOwnProperty(j) && record.hasOwnProperty(j)) {
					// remove the reference to this index
					data[j][record[j]].remove(index);
				}
			}		
		},

		/**
		 * Clear the index
		 */
		clear : function() {
			var i;
			for (i in data) {
				if (data.hasOwnProperty(i)) {
					JSORM.clear(data[i]);
				}
			}
		},

		/**
		 * Find all records that fit a particular query. There are three possible responses:
		 * <ul>
		 * <li>match - found some records that match the query, hence will return an array of locations</li>
		 * <li>nomatch - able to perform the query, but found no matches, hence return an empty array</li>
		 * <li>noquery - unable to perform the query because one or more of the following is true:
		 *   <ul>
		 *    <li>The query type compares clause is not indexable by this index, e.g. "contains"</li>
		 *    <li>The query type is invalid or not a primitive</li>
		 *    <li>The query type field is not indexed</li>
		 * </ul>
		 * For example, a match returns an array [1,5,789]; nomatch returns an empty array []; noquery returns null. 
		 * 
		 * @param {Object} query A standard search term; a primitive will be accepted while a composite will be ignored
		 * @returns {Array} Array of matches locations, internal to the storage engine, empty if not matches, null if field
		 *    is not indexed or the search type is not compatible 
		 */
		find : function(query) {
			var ret = null, field;
			// first check if this is something we can match
			if (query && query.field && query.compare && (field = data[query.field]) && query.compare === "equals") {
				// we return the indexes where it matches
				ret = field[query.value];
			}
			return(ret);
		},

		/**
		 * Update the information in one record. If a field is changed, and that field is indexed mark it as changed.
		 * 
		 * @param {Object} old The old data for the record. Only the changed data should be passed.
		 * @param {Object} newdata The new data for the record. Only the changed data should be passed.
		 * @param {Object} index The index of the record.
		 */
		update : function(old,newdata,index) {
			var i, field;
			// check each field if it is indexed
			for (i in newdata) {
				if (newdata.hasOwnProperty(i) && data.hasOwnProperty(i) && (field = data[i]) && old[i] !== newdata[i]) {
					// if the field is indexed, change the value for a particular index. Here it is indexed,
					//  so we remove the index from the old value and add it to the new
					field[old[i]].remove(index);
					field[newdata[i]].push(index);
				}
			}
		}
	});
	// initialize fields
	this.fields(f);
	
});
	
