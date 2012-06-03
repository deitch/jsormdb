/**
 * @author adeitcher
 * @fileOverview Ensure that appropriate vars are defined.
 */
/*
 * Ensure that our variables are in place
 */
/*jslint node:true */
/*global exports */
var j = exports || {}, JSORM;

/* and what if I am in node? then I need to get JSORM, it will not be a global */
if (typeof(require) === "function" && typeof(process) === "object" && typeof(process.version) === "string" && typeof(JSORM) === "undefined") {
  JSORM = require('jsorm-utilities');
}

/**
 * @namespace Container for all jsormdb
 */
j.db = {
	/** @namespace Container for all index components */
	index: {}, 
	/** @namespace Container for all parser components */
	parser: {}, 
	/** @namespace Container for all channel components */
	channel: {}
};

