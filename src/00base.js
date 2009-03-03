/**
 * @author adeitcher
 * @fileOverview Ensure that appropriate vars are defined.
 */
/*
 * Ensure that our variables are in place
 */
/*global JSORM */
JSORM = JSORM || {};

/**
 * @namespace Container for all jsormdb
 */
JSORM.db = {
	/** @namespace Container for all index components */
	index: {}, 
	/** @namespace Container for all parser components */
	parser: {}, 
	/** @namespace Container for all channel components */
	channel: {}
};

