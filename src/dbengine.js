/**
 * @author adeitcher
 * @fileOverview Storage engines for jsormdb. Currently only supports in-memory array and in-memory hash
 */
/*global JSORM */


/** 
 * @namespace Container for all engine components, and parent for included engines
 */
JSORM.db.engine = function(){
	var apply = JSORM.apply;
	
	var compares = {
		equals: function(name,val) {return(function(entry){return(entry[name]===val);});},
		"in": function(name,val) {
				var h, ret;
				if (val.isArray) {h=val.hasher(); ret = function(entry){return(h.hasOwnProperty(entry[name]));};}
				else {ret = null;}
				return(ret);
			},
		gt: function(name,val) {
				return(typeof(val) === "number" ? function(entry){return(entry[name]>val);} : null);
			},
		ge: function(name,val) {
				return(typeof(val) === "number" ? function(entry){return(entry[name]>=val);} : null);
			},
		lt: function(name,val) {
				return(typeof(val) === "number" ? function(entry){return(entry[name]<val);} : null);
			},
		le: function(name,val) {
				return(typeof(val) === "number" ? function(entry){return(entry[name]<=val);} : null);
			},
		starts: function(name,val) {
				return(typeof(val) === "string" ? function(entry){return(entry[name].indexOf(val) === 0);} : null);
			},
		ends: function(name,val) {
				return(typeof(val) === "string" ? function(entry){var a = entry[name]; return(a.length-a.indexOf(val)-val.length === 0);} : null);
			},
		contains: function(name,val) {
				return(typeof(val) === "string" ? function(entry){return(entry[name].indexOf(val) >= 0);} : null);
			},
		isnull: function(name,val) {return(function(entry){return(entry[name]===null);});},
		notnull: function(name,val) {return(function(entry){return(entry[name]!==null);});}
	};	

	/**
	 * validate and construct the query term. An individual query *result* may return false, but
	 * the query itself *must* be valid
	 * 
	 * @param {Object} where A standard query term, either composite or primitive
	 * @private
	 */
	var constructQuery = function(where) {
		var valid = false, q, q2, subquery, len, i, list;
		if (where.hasOwnProperty('field')) {
			if (where.field && typeof(where.field) === "string" && where.hasOwnProperty('compare') &&
			 	compares.hasOwnProperty(where.compare) && where.hasOwnProperty("value") &&
				(subquery = compares[where.compare](where.field,where.value))) {
					// create a function that checks the record for a mtach
					/** @ignore */
					q = subquery;

					// we got this far, it is valid
					valid = true;
				}
		} else if (where.hasOwnProperty('join')) {
			if ((where.join === "and" || where.join === "or") && 
				where.hasOwnProperty("terms") && where.terms.isArray && where.terms.length > 0) {
					list = [];
					for (i=0, len=where.terms.length; i<len; i++) {
						if ((q2 = constructQuery(where.terms[i]))) {list.push(q2);} 
						else {return(null);}
					}

					// create a function that covers all of these, but make sure to do proper closure
					/** @ignore */
					q = function(subs,isand) {
						return(function(record) {
							var i, len, match;
							// compound, join them all with appropriate term
							for (i=0, len=subs.length; i<len; i++) {
								match = subs[i](record);
								// check each return, see if we add it or match it
								// and: it must be in all
								// or: it must be in one
								// in "and" case, a single failure ruins the whole thing, just stop
								// in "or" case, a single match does the whole thing, just stop
								//if ((isand && !match) || (!isand && match)) {
								if (isand !== match) {
									break;										
								}								
							}
							// return our match, either all or none
							return(match);										
						});
					}(list,where.join==="and");
					
					// we got this far, it is valid
					valid = true;
				}
		} else {
			q = null;
		}
		return(valid ? q : function(){return(null);});						
	};
	
	return /** @lends JSORM.db.engine  */{
		/**
		 * Construct a query function from a where statement that is suitable to testing each record in a table for 
		 *   a full-table scan
		 * 
		 * @param {Object} where Standard search term, either primitive or composite
		 * @returns {Function} A function that takes a single javascript object, i.e. a table record, 
		 *    as an argument and reports if it matches by returning a boolean: true or false
		 */
		constructQuery : function(where) {
			return(where && typeof(where) === "object" ? constructQuery(where) : function() {return(true);});
		}
	};
	
}();

/** 
 * Create new JSORM.db.engine.array.
 * @class Array-based in-memory storage engine.<br/>
 * Note: array engine does not support indexing
 */
JSORM.db.engine.array = JSORM.extend(JSORM.db.engine,function() {
	this.type = "array";
	var data = [];
	var apply = JSORM.apply;

	
	
	apply(this,/** @lends JSORM.db.engine.array.prototype  */{
		/**
		 * Determine how many records are in the database. Equivalent of "select count(index)"
		 * 
		 * @returns {Integer} Number of records
		 */
		length : function() {
			return(data.length);
		},
		/**
		 * Insert an arbitrary number of records into the database. 
		 * 
		 * @param {Object|Object[]} records The records to insert, either a single JavaScript object or an array of objects.
		 */
		insert : function(records) {
			var i, len, locs = [], index = data.length;

			// add it to the array
			data.insert(index,records);
			// create the info for the index
			for (i=0, len=records.length; i<len; i++) {locs.push(index+i);}
		},

		/**
		 * Remove a single record from the database at a particular location. 
		 * 
		 * @param {Integer} index The location at which to remove the record
		 * @returns {Object} The removed record
		 */
		remove : function(index) {
			var entry = data.splice(index,1);		
			// remove from the index, if relevant
			return(entry);
		},

		/**
		 * Clear all records from the database.
		 */
		clear : function() {
			data.clear();
		},

		/**
		 * Get records at one or more locations. 
		 * Equivalent of "select * where index in [index]" or "select * where index = index"
		 * 
		 * @param {Integer|Integer[]} index A location or array of locations whose records are desired.
		 * @param {Object} fields An object indicating which fields of the records at index to retrieve. The object should
		 *    have one element with a value of true for those elements in the record desired in the results. If the fields
		 *    argument is null or undefined, all fields are returned.
		 * @returns {Object|Object[]} The fields desired for the records selected, either a single record if index is an
		 *    integer or an array of record of index is an array.
		 */
		get : function(idx, fields) {
			var ret, i, len;
			if (idx === null || typeof(idx) === "undefined") {
				ret = data;
			} else if (idx && idx.isArray) {
				ret = [];
				for (i=0, len=idx.length; i<len; i++) {
					ret.push(apply({},data[idx[i]],fields));
				}
			} else {
				ret = apply({},data[idx],fields);
			}
			return(ret);
		},

		/**
		 * Update records at one or more locations. 
		 * Equivalent of "update newData where index in [index]" or "update newData where index = index"
		 * 
		 * @param {Object} newData An object with the data to replace at the desired indexes. 
		 * @param {Integer|Integer[]} index A location or array of locations whose records are desired to be updated.
		 * @returns {Object[]} The changed fields of the old records.
		 */
		update : function(idx, newData) {
			var r, i, len, oldData = [], changes;
			for (i=0,len=idx.length; i<len; i++) {
				// get the existing record
				r = data[idx[i]];
				if (r) {
					// keep the old data
					changes = {};
					// for each entry in the new data, keep the old data at that entry, and then overwrite it in the
					//   core data store
					apply(changes,r,newData);
					apply(r,newData);
					oldData[i] = changes;
				}			
			}

			// return the old data for the journalling
			return(oldData);
		},

		/**
		 * Add a new field or fields to the index.
		 * 
		 * @param {String|String[]} fields String name of a field to add, or an array of fields. If the field is already
		 *   indexed or does not exist, nothing will happen for those fields. 
		 */
		addIndex : function(fields) {
			// array does not really support indexing
		},

		/**
		 * Remove a field or fields from the index.
		 * 
		 * @param {String|String[]} fields String name of a field to remove, or an array of fields. If the field is not
		 *   indexed or does not exist, nothing will happen for those fields. 
		 */
		removeIndex : function(fields) {
			// array does not really support indexing
		},

		/**
		 * Search for records within the database.
		 * 
		 * @param {Object} where Standard search term, either a primitive or a composite
		 * @param {Integer[]} limit List of indexes to check for a match. If blank, will check all entries.
		 * @return {Integer[]} Array of indexes that match the query
		 */
		query : function(where,limit) {
			var i, len, match = [], idx, fn;
			// not indexed
			fn = this.constructQuery(where);

			// if a limited set of index entries was provided, use it
			if (limit) {
				for (i=0,len=limit.length;i<len;i++) {
					idx = limit[i];
					if (fn(data[idx])) {match.push(idx);}
				}
			} else {
				// else full table scan
				for (i=0,len=data.length; i<len; i++) {
					if (fn(data[i])) {match.push(i);}
				}
			}
		}
	});
		
});
	
	
	
/** 
 * Create new JSORM.db.engine.hash
 * @class Hash-based in-memory storage engine
 * 
 * @param {Object} index A pre-constructed index to use for this table storage engine. If none is passed, use the default
 *    JSORM.db.index.hash.
 */
JSORM.db.engine.hash = JSORM.extend(JSORM.db.engine,function(index) {
	this.type = "hash";
	var data = {}, length = 0, max = 0, unused = [];
	var apply = JSORM.apply; 
	index = index || JSORM.db.index.hash();

	apply(this,/** lends JSORM.db.engine.hash.prototype */{
		/**
		 * Determine how many records are in the database. Equivalent of "select count(index)"
		 * 
		 * @returns {Integer} Number of records
		 */
		length : function() {
			return(length);
		},

		/**
		 * Insert an arbitrary number of records into the database. 
		 * 
		 * @param {Object|Object[]} records The records to insert, either a single JavaScript object or an array of objects.
		 */
		insert : function(records) {
			var i, len, idx, locs = [];

			// all records are added at the next available slot
			for (i=0,len=records.length;i<len;i++) {
				// the place we put it is either at the next unused spot, or at the max, which must then be incremented
				if (typeof(idx = unused.shift()) === "undefined") {idx = max++;}
				data[idx] = records[i];
				// save the index where it was
				locs.push(idx);

				// extend the length
				length++;
			}

			// add the new records to the index
			index.add(locs,records);

			return(locs);
		},

		/**
		 * Remove a single record from the database at a particular location. 
		 * 
		 * @param {Object} index The internal index location at which to remove the record
		 * @returns {Object} The removed record
		 */
		remove : function(idx) {
			var entry = data[idx];
			delete data[idx];
			// remove from the index, if relevant
			index.remove(idx,entry);
			length--;
			// reduce the max, if we just reduced the last one
			if (idx+1 === max) {
				max--;
			} else {
				unused.push(idx);
			}
			return(entry);
		},

		/**
		 * Clear all records from the database.
		 */
		clear : function() {
			// clear out the data
			JSORM.clear(data);
			// clear out the index
			index.clear();
			// clear out the unused
			unused.clear();
			// mark that we are empty
			length = 0;
			// the max is 0
			max = 0;
		},

		/**
		 * Get records at one or more locations. 
		 * Equivalent of "select * where index in [index]" or "select * where index = index"
		 * 
		 * @param {Integer|Integer[]} index A location or array of locations whose records are desired.
		 * @param {Object} fields An object indicating which fields of the records at index to retrieve. The object should
		 *    have one element with a value of true for those elements in the record desired in the results. If the fields
		 *    argument is null or undefined, all fields are returned.
		 * @returns {Object|Object[]} The fields desired for the records selected, either a single record if index is an
		 *    integer or an array of record of index is an array.
		 */
		get : function(idx,fields) {
			var ret, i, len;
			if (idx === null || typeof(idx) === "undefined") {
				// need to return as an array
				ret = [];
				for (i in data) {
					if (i && typeof(i) !== "function" && typeof(data[i]) === "object") {ret.push(data[i]);}
				};
			} else if (idx && idx.isArray) {
				ret = [];
				for (i=0, len=idx.length; i<len; i++) {
					ret.push(apply({},data[idx[i]],fields));
				}
			} else {
				ret = apply({},data[idx],fields);
			}
			return(ret);
		},

		/**
		 * Update records at one or more locations. 
		 * Equivalent of "update newData where index in [index]" or "update newData where index = index"
		 * 
		 * @param {Object} newData An object with the data to replace at the desired indexes. 
		 * @param {Integer|Integer[]} index A location or array of locations whose records are desired to be updated.
		 * @returns {Object[]} The changed fields of the old records.
		 */
		update : function(idx, newdata) {
			var r, i, len, oldData = [], changes;
			idx = [].concat(idx);
			for (i=0,len=idx.length; i<len; i++) {
				// get the existing record
				r = data[idx[i]];
				if (r) {
					// keep the old data
					changes = {};
					// for each entry in the new data, keep the old data at that entry, and then overwrite it in the
					//   core data store
					apply(changes,r,newdata);
					apply(r,newdata);
					oldData[i] = changes;
					// update the index
					index.update(changes,newdata,idx[i]);				
				}			
			}

			// return the old data for the journalling
			return(oldData);
		},

		/**
		 * Add a new field or fields to the index.
		 * 
		 * @param {String|String[]} fields String name of a field to add, or an array of fields. If the field is already
		 *   indexed or does not exist, nothing will happen for those fields. 
		 */
		addIndex : function(fields) {
			index.fields(fields);
		},

		/**
		 * Remove a field or fields from the index.
		 * 
		 * @param {String|String[]} fields String name of a field to remove, or an array of fields. If the field is not
		 *   indexed or does not exist, nothing will happen for those fields. 
		 */
		removeIndex : function(fields) {
			index.unfields(fields);
		},

		/**
		 * Search for records within the database.
		 * 
		 * @param {Object} where Standard search term, either a primitive or a composite
		 * @param {Object[]} limit List of indexes to check for a match. If blank, will check all entries.
		 * @return {Object[]} Array of indexes that match the query
		 */
		query : function(where,limit) {
			var i, len, subm, match = [], idx, fn;
			// first see if we can get it from the index
			if ((subm = index.find(where)) !== null) {
				match = subm;
			} else {
				// not indexed
				fn = this.constructQuery(where);
				
				// if a limited set of index entries was provided, use it
				if (limit) {
					for (i=0,len=limit.length;i<len;i++) {
						idx = limit[i];
						if (fn(data[idx])) {match.push(idx);}
					}
				} else {
					// else full table scan
					for (i in data) {
						if (i && typeof(data[i]) === "object" && fn(data[i])) {match.push(i);}
					}
				}
			}
			return(match);		
		}
		
	});
	
});


