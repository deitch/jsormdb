/**
 * @author adeitcher
 * @fileOverview Storage engines for jsormdb. Currently only supports in-memory array and in-memory hash
 */
/*global JSORM */


/** 
 * @namespace Container for all engine components, and parent for included engines
 */
JSORM.db.engine = function(){
	var apply = JSORM.apply, clone = JSORM.clone;
	var compares, pass1, pass2, pass3, intersection, union, keysAsArray, isPrimitive, isCompound;
	
	compares = {
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

	intersection = function() {
		var result,i,len,o;
		if (!arguments || arguments.length<1) {
			result = {};
		} else if (arguments.length == 1 && typeof(arguments[0]) === "object") {
			result = arguments[0];
		} else {
			result = arguments[0].isArray ? arguments[0].hasher() : arguments[0];
			for (i=1,len=arguments.length;i<len;i++) {
				o = arguments[i].isArray ? arguments[i].hasher() : arguments[i];
				result = JSORM.common(result,o,true);
			}
		}
		return(result);
	};
	
	union = function() {
		var result,i,len,o;
		if (!arguments || arguments.length<1) {
			result = {};
		} else {
			result = {};
			for (i=0,len=arguments.length;i<len;i++) {
				o = arguments[i].isArray ? arguments[i].hasher() : arguments[i];
				result = JSORM.apply(result,o);
			}					
		}
		return(result);
	};
	
	keysAsArray = function(o) {
		var i, r = [];
		for (i in o) {
			if (i && o.hasOwnProperty(i) && typeof(o[i]) !== "function") {r.push(i);}
		}		
		return(r);
	};
	
	isPrimitive = function(where) {
		return(where.hasOwnProperty('field') && where.field && typeof(where.field) === "string" &&
			where.hasOwnProperty('compare') && where.compare && compares[where.compare] && 
			(where.hasOwnProperty("value") || where.compare === "isnull" || where.compare === "notnull"));
	};
	isCompound = function(where) {
		return(where.hasOwnProperty("join") && (where.join === "and" || where.join === "or") && 
				where.hasOwnProperty("terms") && where.terms.isArray);
	};
	
	/**
	 * First pass against the query tree. Attempts to match any primitive against the index.
	 * 
	 * @param {Object} where A standard query term, either composite or primitive
	 * @param {Object} index The index
	 * @return {Object} Results tree, where each primitive is either a function to pass a record or an array of result indexes
	 * @private
	 */
	pass1 = function(where,index) {
		var r, r2, i, len, subm;

		// is it a primitive?
		if (isPrimitive(where)) {
				// can we get a result from the index?
				if ((subm = index.find(where)) !== null) {
					r = subm;
				} else {
					// we cannot get from index, so create the function that will process any values
					r = compares[where.compare](where.field,where.value);
				}
		} else if (isCompound(where)) {
			// is it a compound?
			r = {join: where.join, terms:[], fn:[],comps:[]}
			if (where.type) {r.type = where.type};
			for (i=0, len=where.terms.length; i<len; i++) {
				r2 = pass1(where.terms[i],index);
				// determine if it is a list of indexes, or a function
				if (r2.isArray) {
					// indexes, so we merge appropriately
					// if it is and, we want the union; if not, the intersection
					r.terms.push(where.terms[i]);
				} else if (typeof(r2) === "function"){
					// function, so we keep each one
					r.fn.push(r2);
				} else {
					// another compound
					r.comps.push(r2);					
				}
			}
		} else {
			r = null;
		}
		return(r);						
	};
	
	/**
	 * Second pass against the query tree. Resolve any functions using the resultant intersections or all records
	 * 
	 * @param {Object} where A query tree, output of pass1(), where each primitive is a fn() or []
	 * @param {}
	 * @return {Object} Results tree, where each primitive is a set of indexes
	 * @private
	 */
	pass2 = function(where,foreach,index,limit) {
		// q is a function that returns null, unless it explicitly becomes valid
		var r = [], r2, r3, subquery, i, len, j, lenj, list, keeper, typelimit;
		
		/*
		 * How does this work? Everything passed will be like a compound.
		 * 		A: join AND: 
		 * 				1) take the intersection of any earlier terms
		 * 				2) take those results, and feed each one into each function. Those for which every function returns 
		 * 					true, we keep; others are discarded
		 * 				3) take those results, and use them as a limit. Feed those as the limiting factor into 
		 * 					each sub-compound
		 * 			Any that survive all three steps are valid.
		 * 		B: join OR:
		 * 				1) take the union of any earlier terms
		 * 				2) take the limit, or the entire data set, and feed each one into each function. Those for which any
		 * 					function returns true, we keep; others are discarded
		 * 				3) take the limit, or the entire data set, and feed each one into each sub-compound. Union the results
		 * 					of each compound into the total set.
		 * 			Any that survive any one step are valid.
		 */
		// is there a type limit?
		if (where.type) {
			typelimit = index.find({field:'type',compare:'equals',value:where.type});
			limit = limit ? intersection(limit,typelimit) : typelimit.hasher();
		}
		
		if (where.join === "and") {
			// AND join - intersection
			
			// was there any limit to start?
			if (limit) {r2 = limit;}
			
			// 1) if we had any where terms, further restrict
			if (where.terms && where.terms.length>0) {
				// first merge all of the previous terms
				r3 = intersection.apply(this,where.terms);
				r2 = r2 ? intersection(r3,r2) : r3;
			}
			
			// 2) feed the matching function into foreach - keep only those that match every function
			if (where.fn && where.fn.length > 0) {
				// go through each one from before
				r2 = foreach(function(record) {
					// will we keep this?
					keeper = true;
					for (i=0,len=where.fn.length;i<len;i++) {
						if (!where.fn[i](record)) {
							// it did not match even one function, and we are doing intersection AND,
							//  so skip entirely
							keeper = false;
							break;
						}
					}
					return(keeper);
				},r2?keysAsArray(r2):null);
			}
			
			// intersection with any sub-compounds - must be limited to r2
			if (where.comps && where.comps.length>0) {
				for (i=0,len=where.comps.length;i<len;i++) {
					// AND = intersection, therefore only those in both the sub-compound *and* 
					//    the current r2 are kept.
					r2 = pass2(where.comps[i],foreach,index,r2);
				}
			}

		} else {
			// OR join - union
			
			// take the limit (if any), else the entire data set as our starting point
			// feed that into the first function
			// the results of the first function are saved
			// feed the limit (if any), else the entire data set into the second function 
			// add those results to the results of the first function
			// repeat for all of the functions
			// results are all are the final set

			// 1) use the limit or entire data set as a starting point

			// union with the previous terms from the indexed output
			if (where.terms.length>0) {
				r2 = union.apply(this,where.terms);
				r2 = limit ? intersection(r2,limit) : r2;
			}
			
			
			// 2) feed the function into foreach, adding the results to the final set
			if (where.fn.length > 0) {
				r3 = foreach(function(record){
					var matched = false;
					for (i=0,len=where.fn.length;i<len;i++) {
						// go through each function; as soon as one is matched on this entry, keep it and go to next
						//      index entry
						if (where.fn[i](record)) {
							matched = true; 
							break;
						}
					}
					return(matched);
				},limit);
				r2 = r2 ? union(r2,r3) : r3.hasher();					
			}
			
			// 3) results are all of the final set, the union of the output of all functions, i.e. r2
			
			// union with any sub-compounds
			if (where.comps.length>0) {
				for (i=0,len=where.comps.length;i<len;i++) {
					if ((r3 = pass2(where.comps[i],foreach,index,limit)) && r3.isArray) {
						for (j=0,lenj=r3.length; j<lenj;j++) {
							r2[r3[j]] = true;
						}
					}
				}
			}
		}
		// r2 now contains a hash, where each key is a valid index, and each value is true;
		//  just turn it into an array in r
		if (r2) {
			r = r2.isArray ? r2 : keysAsArray(r2);				
		} else {
			r = [];
		}

		// we have now devolved an entire compound of primitives into a single array of indexes
		//     which is precisely what we wanted
		return(r);
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
		executeQuery : function(where,index,foreach) {
			var i, len, subm, match = [], idx, fn, results, tmp;

			// if the where is blank, just return them all
			if (!where) {
				results = foreach(function(record){
					return(true);
				});
			} else {
				// before we do it, the root of our tree must always be a compound
				if (isPrimitive(where)) {
					tmp = {join:'and'};
					if (where.type) {tmp.type = where.type;}
					delete where.type;
					tmp.terms = [where];
					where = tmp;
				}
				
				// two passes
				// first pass: for each primitive, convert to results from index or function
				//             for each compound, split terms of the compound into: compounds, results or functions
				results = pass1(where,index);

				// second pass: go through the tree, resolve each function by passing it the results of the intersection (AND)
				//    or all of the records (OR) and mergin the results together
				//  
				results = pass2(results,foreach,index);				
			}
			
			
			return(results);		
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
	var data = [], index = null;
	var apply = JSORM.apply;
	// the looping function
	var foreach = function(fn,limit) {
		var i, len, r = [];
		if (limit && limit.isArray)  {
			for (i=0,len=limit.length;i<len;i++) {
				if (fn(data[limit[i]])) {
					r.push(limit[i]);
				}
			}
		} else {
			for (i=0,len=data.length;i<len;i++) {
				if (fn(data[i])) {
					r.push(i);
				}
			}
		}
		return(r);			
	};

	
	
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
		query : function(where) {
			return(this.executeQuery(where,index,foreach));
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

	var foreach = function(fn,limit) {
		var i,len,r = [];
		if (limit) {
			for (i=0,len=limit.length;i<len;i++) {
				if (fn(data[limit[i]])) {
					r.push(limit[i]);
				}
			}
		} else {
			for (i in data) {
				if (fn(data[i])) {
					r.push(i);
				}
			}
		}
		return(r);
	};

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
				}
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
		query : function(where) {
			return(this.executeQuery(where,index,foreach));
		}
		
	});
	
});


