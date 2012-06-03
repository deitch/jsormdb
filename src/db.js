/**
 * @fileOverview Database with full transactions, partial and complete rollbacks, load from and store
 * to server-side, and much much more
 * @author adeitcher
 */
/*global JSORM, j */

/** 
 * @constructor
 * Create new JSORM.db.db
 * @param {Object} [config] Configuration parameter.
 * @param {Object} [config.channel] Channel to use for communication with a remote data source
 * @param {Object} [config.parser] Parser to use for interepreting communication with a remote data source
 * @param {Object} [config.updateParams] Object literal with parameters to pass to the channel for each commit(), by default
 * @param {Object} [config.loadParams] Object literal with parameters to pass to the channel for each load(), by default
 */
j.db.db = JSORM.extend({},	function(config) {
	// ensure config is an object for convenience
	config = config || {};

	// convenience definitions
	var clone = JSORM.clone, common=JSORM.common, apply=JSORM.apply, fork = JSORM.fork, first=JSORM.first,
	
	journal = [], channel = config.channel || null, idField, myclass = this.myclass,
	// updateMode, writeMode
	updateMode = config.updateMode || myclass.updates.nothing, writeMode = config.writeMode || myclass.modes.nothing,
	// we automatically use "type" as an indexed field
	store = j.db.engine.hash(j.db.index.hash("type")),
	// default writeMode, updateMode
	defaultWriteMode = myclass.modes.nothing, defaultUpdateMode = myclass.updates.nothing,
	// do we have a parser?
	parser = config.parser || j.db.parser.json(),
	// params
	updateParams = config.updateParams || {}, loadParams = config.loadParams || {}, 
	findInternal, clearInternal, loadData, loadCallback, removeAt, write, writeCallback;


	// create event-handling
	JSORM.eventualize(this);

	// register events that we handle
	this.events(
		'load', 'loadexception', 'add','datachanged','clear','update',
		'beforewrite','write','writeexception','commit', 'commitexception');

	/*
	 * BEGIN PRIVATE FUNCTIONS
	 */

	/**
	 * Internal search function, returns the index
	 */
	findInternal = function(args) {
		var ret = null, i, len, query, idx, data;
		
		// query the store
		idx = store.query(args.where);

		// now our idx, if valid, has all of the index entries;
		//  either return the indexes or get all of the actual entries
		if (idx) {
			if (args.index) {ret = idx;}
			else {
				ret = [];
				for (i=0,len=idx.length; i<len;i++) {
					data = store.get(idx[i]);
					ret.push(apply({},clone(data),args.fields));
				}				
			}
		}

		return(ret);
	};
	
	clearInternal = function(log) {
		// log the event in the journal, unless suppressed
		if (log) {
			journal.push({type: myclass.types.clear, data: store.get()});
		}

		// clear out the data
		store.clear();
	};

	loadData = function(data) {
		var r = data.records;
		clearInternal(false);
		idField = data.id || "id";
		store.addIndex(idField);		
		store.addIndex('type');
		store.insert(r);
		// clean out the journal
		journal.clear();
	};

	/**
	 * Load new records - called asynchronously with callback handler.
	 * Loading records always means the old transaction is wiped clean and a new transaction is begun
	 * immediately *after* the load is complete. In other words, the load itself is not in the journal. 
	 * The process is as follows:
	 * 1) Wipe journal clean (remove old transaction)
	 * 2) Do the load
	 * 3) Start a new transaction journal
	 */
	loadCallback = function(args){
		var options = args.options || {}, r = [], parsed, processed = false,
		e, sfcb, cb = args.callback, scope = args.scope || this;

		// only clear and load if we successfully get and parse the data
		if (args.success && (parsed = parser.read(args.response))) {
			// attempt to load the new data
			loadData(parsed);

			// we successfully processed
	        r = parsed.records;
			processed = true;

			// specific events
			sfcb = options.success;
			e = "load";
		} else {
			sfcb = options.failure;
			e = "loadexception";
		}

		// general event
        this.fire(e, {records: r, options: options});

		// specific success/failure callback
		if (sfcb && typeof(sfcb) === "function") {sfcb.call(scope, r, options, processed);}

		// always call our callback, whether successful or not
        if(cb && typeof(cb) === "function"){
			cb.call(scope, r, options, processed);
		}
	};

  removeAt = function(index){
		var i,len, removed = [], entry;
		index = [].concat(index);
		for (i=0,len=index.length;i<len;i++) {
			entry = store.remove(index[i]);
			removed.push(entry);
		}
		return(removed);
  };

	write = function(mode) {
		var data, tmp, i, len, j, lenj, recs = {}, entry, den, curId, condensed, orig;

		// replace mode just dumps it all
		if (mode === myclass.modes.replace) {
			// get the actual data in the records, no indexes, we don't care about the journal
			data = store.get();
		} else {
			data = [];
			/*
			 * If we already have an entry, so just update that one
			 * What we do with condensed largely depends on what we want to do next and what we did previously
			 * - If we are updating an already updated record, we can just add updates
			 * - If we are updating a record that was added in this transaction, just change the add data
			 * - If we are removing a record, make that the only activity
			 * - If we are adding a record, do it straight out
			 */
			condensed = mode === myclass.modes.condensed;

			// get the actual data in the record
			for (i=0, len=journal.length; i<len; i++) {
				// recall the structure of each journal entry
				//  {type: change/add/remove/clear/load, }
				entry = journal[i];
				if (entry !== null) {
					// go through each one, then see what we do
					switch(entry.type) {
						case myclass.types.change: 
							// keep a list of the affected IDs, and make sure they also point to this idx entry
							orig = entry.data.original;
							for (j=0,lenj=orig.length; j<lenj;j++) {
								curId = orig[j].id;
								// are we condensed, and did we have a previous entry?
								if (condensed && recs[curId]) {
									// previous ones will be add or change, so modify that one
									// if it was a change, we need to remove it
									apply(recs[curId].data,entry.data.changed);
								} else {
									// either a previous change to this record does not exist, or 
									den = {
										type: entry.type,
										data: clone(entry.data.changed)
									};
									// save the ID field
									den.data[idField] = curId;
									recs[curId] = den;
									data.push(den);									
								}
							}
							break;
						case myclass.types.add:
							// the data entry to be sent to the server - we need to get the actual data
							tmp = store.get(entry.data);
							// store these; there is no way we have a previous journal entry for a newly added record 
							for (j=0,lenj=tmp.length;j<lenj;j++) {
								den = {
									type: entry.type,
									data: tmp[j]
								};
								recs[tmp[j][idField]] = den;
								data.push(den);
							}
							break;
						case myclass.types.clear:
							data.push({
								type: entry.type
							});
							break;
						case myclass.types.remove:
							tmp = [];
							den = {};
							// keep a list of the affected IDs, and make sure they also point to this idx entry
							for (j=0, lenj=entry.data.length; j<lenj; j++) {
								curId = entry.data[j][idField];
								tmp.push(curId);
								// are we in condensed mode and there was a previous record?
								if (condensed && recs[curId]) {
									// previous ones will be add or change, so remove it from the list
									recs[curId].data.remove(curId);
									// if it was a change, we need to remove it
									if (recs[curId].type === myclass.types.change) {
										recs[curId] = den;																			
									}
								} else {
									recs[curId] = den;									
								}
							}
							den.type = entry.type; den.data = tmp;
							data.push(den);
							break;
						default:
							break;
					}					
				}
			}
		}
		return(data);
	};

	/**
	 * Handle the results of a write. 
	 * 
	 * @arg o Object options passed to the original write call
	 * @success boolean whether the write succeeded or not
	 * @response String full contents of response from the server
	 */	
	writeCallback = function(args) {
		// if the POST worked, i.e. we reached the server and found the processing URL,
		// which handled the processing and responded, AND the processing itself succeeded,
		// then success, else exception
		var i, len, response = args.response, o = args.options || {}, update,
		r = [], e, sfcb, cb = o.callback, scope = o.scope || this, options = o.options,
		newRec, where, index;

		// the expectation for success is that the application itself will determine it
		//  via a 'write' handler
		if (args.success) {
			if (this.fire('write',{options: o, data: response}) !== false) {
				// update fields or even whole new records from the server
				//  if requested either via options.update or this.updateMode

				// we have a few possibilities:
				// 1) We replace all our data with that from the server - either we are in mode.replace or we explicitly 
				//    said to do so for this write
				// 2) We update our data with that from the server, i.e. apply journal changes
				// 3) We make no changes to our local data
				// which update mode will we work in? Try to use local option, then db-wide, then system default
				update = first(o.update,updateMode,defaultUpdateMode);

				switch(update) {
					case myclass.updates.nothing:
						// do nothing
						break;
					case myclass.updates.replace:
						// replace: read our data and then replace everything
						r = parser.read(response);
						loadData(r);
						break;
					case myclass.updates.update:
						// update: read our data and then go through each record one by one:
						// - if a record with this record's ID exists, update
						// - if one does not, add it a new
						r = parser.read(response);
						where = {field: idField, compare: 'equals'};

						// we worked in journal mode, so take the changes they recommend and apply them
						for (i=0, len=r.records.length; i<len;i++) {
							newRec = r.records[i];

							// do we have a record with this id? It should be indexed, because it is the ID field
							// if it exists, get the original record and update it, else mark it to add
							where.value = newRec[idField];
							index = findInternal({where: where, index: true});
							if (index && index.length > 0) {
								store.update(index,newRec);								
							} else {
								store.insert(newRec);
							}
						}
						break;
				}

				// clean out the journal
				journal.clear();

				// EVENTS AND CALLBACKS FOR SUCCESS
				// 1) Specific to this transaction
				sfcb = o.success;
				// 2) All commit registered handlers
				e = "commit";
			} else {
				// some callback said not to complete the write
				sfcb = o.failure;
				e = "commitexception";
			}
		} else {
			// EVENTS AND CALLBACKS FOR FAILURE
			// 1) Specific to this transaction
			sfcb = o.failure;
			// 2) All write failure registered handlers
			e = "writeexception";
		}

		// general event
		this.fire(e,{options: o, data: response});
		// success/failure callback
		if (sfcb && typeof(sfcb) === "function") {sfcb.call(scope,this,options,response);}
		// general callback
		if (cb && typeof(cb) === "function") {cb.call(scope,this,options,response);}
	};
	
	/*
	 * END PRIVATE FUNCTIONS
	 */
	
	/*
	 * BEGIN PRIVILEGED FUNCTIONS
	 */

	apply(this,/** @lends JSORM.db.db.prototype  */{
		/**
		 * Insert new data directly into the database. The parser will parse.
		 * An insert is considered part of a transaction and is logged in the journal. 
		 * If you wish to start afresh, use load() instead.
		 * 
		 * @param {Object[]} data Array of data objects to insert into the database
		 */
		insert : function(data) {
			var index;

			// parse the data if relevant
			if (data) {
				// if it is a string, send it to a parser, else use directly
				if (typeof(data) === "string") {
					data = parser.read(data);
					if (data && typeof(data) === "object") {data = data.records;}
				}

				// use internal function for the insert and log it to the journal
				index = store.insert(data);
				journal.push({type: myclass.types.add, data: index});

				// tell everyone we have added
		        this.fire("add", {records: data});
			}

		},

		/**
		 * Search by query. Returns an array of indexes. No matches will return an empty array; invalid query will return null.
		 * 
		 * @param {Object} params Search parameters
		 * @param {Object} params.where Proper query term, either composite or primitive
		 * @param {Object} [params.fields] Fields to return. This is an object literal. All fields that are set to non-null and 
		 *   have a match will return those fields. Returns all fields if null.
		 * @returns {Object[]} Array of the matched records
		 */
		find : function(params) {
			params = params || {};
			var data = findInternal({where: params.where, fields: params.fields, index: false});
			return(data);
		},

		/**
		 * Update records based on a where clause
		 * 
		 * @param {Object} params Update parameters
		 * @param {Object} params.where Proper query term, either composite or primitive, to determine which records to update.
		 *    If null, update all.
		 * @param {Object} data New data to enter into all the updated reocrds that match the search term. Single object literal.
		 */
		update : function(params) {
			var index, oldData, det = [], i, len, args = params || {}, id, idconf;
			// first find the indexes of all the entries that match the where clause
			index = findInternal({where: args.where, index: true});

			// get the oldData and update the records
			oldData = store.update(index,args.data);
			
			// get the IDs of those fields
			idconf = {};
			idconf[idField] = true;
			id = store.get(index,idconf);

			// create the journal of the change
			for (i=0,len=index.length;i<len;i++) {
				det.push({index: index[i], data: oldData[i], id: id[i][idField]});
			}

			// journal the change
			journal.push({type: myclass.types.change, data: {changed: args.data, original: det}});

			// fire the event
			this.fire("update",{records: store.get(index)});
		},


		/**
		 * Load new data to reinitialize this database. This is different from {@link insert} in several ways:
		 * <ol>
		 * <li>The load (and possible replace) are not considered part of the current transaction. The 
		 *     current transaction is terminated, and a new transaction is started immediately after the load</li>
		 * <li>The load can come from either data passed directly or from the channel</li>
		 * <li>load is always asynchronous, whereas insert is synchronous</li>
		 * </ol>
		 * 
		 * @param {Object} args Arguments to the load.
		 * @param {Object} [args.data] Raw data to load. If null, will use the defined channel and parser.
		 * @param {Function} [args.callback] Function to call when the load is complete
		 * @param {Function} [args.success] Function to call when the load succeeds
		 * @param {Function} [args.failure] Function to call when the load fails
		 * @param {Object} [args.scope] Scope within which to call the callbacks. 
		 * @param {Object} [args.options] Object with options to pass to the callback. 
		 */
		load : function(args) {
			args = args || {};
			var params, tp = {callback: args.callback, success: args.success, failure: args.failure, 
				scope: args.scope, options: args.options};
			// need to insert full load from channel function, followed by loadCallback as an async callback
			if (args.data) {
				tp.success = true;
				tp.response = args.data;
				fork({fn: loadCallback, arg: [tp], scope: this});
			} else if (channel) {
				// load asynchronously via the channel, with loadCallback as the callback

				// combine the user params for this call - first the base loadParams, then the per-call params

				// if updateParams have been set for this store, set them
				params = apply({}, loadParams);
				// if particular params have been set for this call, set them
				apply(params, args.params);

				// add any options
				channel.load({params: params, scope: this, callback: loadCallback, options: tp});
			} else {
				// if no channel was defined, and we were not passed data, we cannot load
				tp.success = false;
				fork({fn: loadCallback, arg: [tp], scope: this});				
			}
			return(this);

		},

		/**
		 * Remove records from the database.
		 * 
		 * @param {Object} params Parameters for the removal.
		 * @param {Object} [params.where] Search term, either primitive or composite, to determine which records to remove.
		 */
	    remove : function(params){
			var args = params || {}, index = findInternal({where: args.where, index: true}), removed = removeAt(index);
			// mark the record itself as having been deleted, so we can know if we commit it
			journal.push({type: myclass.types.remove, data: removed});
        this.fire("remove", {records: removed});
	    },

		/**
		 * Clear the database entirely. This is a journaled event and is part of the current transaction.
		 * If you wish to start afresh, use load() instead
		 */
	    clear : function(){
			clearInternal();
			// record that all objects have been removed
	        this.fire("clear");
	    },

		/**
		 * Determine how many changes have been made in the current transaction.
		 * 
		 * @returns {Integer} Number of change steps in the current transaction
		 */
		getModifiedCount: function() {
			return(journal.length);
		},

		/**
		 * Determine if there are any changes in the current transaction. Equivalent of {@link getModifiedCount}() > 0
		 * 
		 * @returns {boolean} If there are any changes
		 */
		isDirty: function() {
			return(journal.length > 0);
		},

		/**
		 * Commit the current transaction. If there is a channel, and a non-nothing update mode,
		 * it will write to the store. If there is no channel, it will just commit. 
		 * The commit mode is determined by the following:
		 * <ul>
		 * <li>options.mode - for this transaction</li>
		 * <li>writeMode - default for this db instance</li>
		 * <li>defaultWriteMode - default for all instances of the db</li>
		 * </ul>
		 * 
		 * @param {Object} [options] Commit options
		 * @param {Object} [options.mode] Which mode to use for committing, one of the static modes
		 * @param {Object} [options.params] Parameters to pass to the channel as part of the update
		 * @param {Function} [options.callback] Function to call when the commit is complete
		 * @param {Function} [options.success] Function to call when the commit has succeeded
		 * @param {Function} [options.failure] Function to call when the commit has failed
		 * @param {options.Object} [options.scope] Scope within which to execute the callbacks
		 * @param {options.Object} [options.options] Options to pass to the callbacks
		 */
	    commit : function(options){
			options = options || {};
			var params, records, mode;
			// which mode will we work in? Try to use local option, then store-wide, then global default
			mode = first(options.mode,writeMode,defaultWriteMode);


			// if there is not channel, we just commit internally
			if (!channel || (mode === myclass.modes.nothing)) {
				journal.clear();
				this.fire("commit",{options: options});			
			} else {
				if (this.fire("beforewrite",{options: options}) !== false) {
					// get the appropriate records - watch out for bad records
					records = write(mode);

					// combine the user params for this call - first the base updateParams, then 
					//   the per-call params. Finally, our privileged params and we can send

					// if updateParams have been set for this store, set them
					params = apply({}, updateParams);
					// if particular params have been set for this call, set them
					apply(params, options.params);
					// finally, add all our params
					apply(params,{
						data: parser.write(records),
						mode: mode
					});

					// add any options
		            channel.update({params: params, callback: writeCallback, scope: this, options: options});			
				}
			}
	    },

		/**
		 * Reject a transaction. If given a count, it will reject the last count activities. If given no count,
		 * a count of 0, or a count greater than the total number of activities in this transaction, it will
		 * reject the entire transaction.
		 * 
		 * @param {Integer} count Number of steps within the transaction to reject. If empty, 0, or greater than the 
		 *   total number of steps, the entire transaction will be rejected.
		 */
	    reject : function(count){
			// are we rejecting all or some?
			var start = 0, index, data, type, i, j, len, lenj, orig, m;
			if (!count || count > journal.length) {
				count = journal.length;
				start = 0;
			} else {
				start = journal.length - count;
			}

			// back out the last 'count' changes in reverse order
			// get the last 'count' elements of the journal
			m = journal.splice(start,count).reverse();
			for (i=0, len=m.length; i<len; i++) {
				index = m[i].index; data = m[i].data; type = m[i].type;
				switch(type) {
					case myclass.types.change:
						//data: {changed: args.data, original: det}
						// reject the changes - although the change itself may have been in bulk,
						//   the old data may have been not. Thus, we need to update each one independently
						orig = data.original;
						for (j=0, lenj=orig.length; j<lenj; j++) {
							store.update(orig[j].index, orig[j].data);
						}
						break;
					case myclass.types.add:
						// undo the add by removing the entry from the end, based on how many there are
						// we remove it from store by index location
						removeAt(data);
						break;
					case myclass.types.remove:
						// put it back
						store.insert(data);
						break;
					case myclass.types.clear:
						// put it back
						store.insert(data);
						break;
					default:
						// do nothing
				}
			}
			// need to fire an event that the data has been updated
	    }
	});
	
	/*
	 * END PRIVILEGED FUNCTIONS
	 */
	
	// were we told which fields to index?
	store.addIndex(config.index);
	// always index 'type'
	store.addIndex('type');
	
	// did we have any data to start?
	if (config.data) {
		this.load({data: config.data});
	}
		
},/** @lends JSORM.db.db  */{
	/**
	 * fixed methods for sending data back to the server
	 */
	modes: {nothing: 0, replace: 1, update: 2, condensed: 3},
	
	/**
	 * fixed methods for updating the store after a response from the server
	 */
	updates: {nothing: 0, update: 1, replace: 2},
	
	/**
	 * fixed types for journal entries
	 */
	types : {change: 0, add: 1, remove: 2, clear: 3, load: 4},
	
	/**
	 * fixed types for joins
	 */
	joins: {or: 0, and: 1}
});

