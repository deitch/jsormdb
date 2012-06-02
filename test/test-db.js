
function getTest(Y) {
	var r, i;
	var initval = [
			{name:"John",age:25,uid:10,type:'person'},
			{name:"Jill",age:18,uid:11,type:'person'},
			{name:"Jack",age:60,uid:12,type:'person'},
			{name:"Jeri",age:45,uid:13,type:'person'},
			{name:"Jono",age:12,uid:14,type:'person'},
			{name:"Ferrari",age:10,type:'car'},
			{name:"Ford",age:15,type:'car'},
			{name:"Fiat",age:6,type:'car'},
			{name:"Honda",age:3,type:'car'},
			{name:"Toyota",age:7,type:'car'}
		];
	var newval = [{name:"Karl",age:25,uid:20},{name:"Kelly",age:18,uid:21},{name:"Kris",age:60,uid:22},{name:"Knute",age:45,uid:23},{name:"Kandy",age:12,uid:24}];
	var jsonO = '{\
		"meta": {"root": "root", "id":"uid"},\
		"root":\
			[\
				{"name":"John","age":25, "uid": 10},\
				{"name":"Jill","age":18, "uid": 11},\
				{"name":"Jack","age":60, "uid": 12},\
				{"name":"Jeri","age":45, "uid": 13},\
				{"name":"Jono","age":12, "uid": 14}\
			]\
		}';
	var jsonA = '[\
			{"name":"John","age":25, "uid": 10},\
			{"name":"Jill","age":18, "uid": 11},\
			{"name":"Jack","age":60, "uid": 12},\
			{"name":"Jeri","age":45, "uid": 13},\
			{"name":"Jono","age":12, "uid": 14}\
		]';
	var name = "Nicholas", age = 29;

	return(new Y.Test.Case({
		name: "jsormdb tests",
		
		createDbPlain : function(cb) {
			var db = JSORM.db.db({parser: JSORM.db.parser.object()});
			db.load({data: initval, callback: cb, index:'name'});
			return(db);
		},
		
		createDbJson : function(cb) {
			db = JSORM.db.db({parser: JSORM.db.parser.json({root: "root"})});
			db.load({data: jsonO, callback: cb})
			return(db);
		},
		
		createDbChannel : function(cb) {
			var db, conf = {url: 'data.json'};
			var db = JSORM.db.db({parser: JSORM.db.parser.json(), channel: JSORM.db.channel.http(conf)});
			db.load({data: jsonO, callback: cb})
			return(db);
		},
		
		_should: { 
			ignore: { 
				testIndex: false,
				testJsonParser: false,
				testHttpChannelLoadUrl: false,
				testHttpChannelUrl: false,
				testLoad: false,
				testFind: false,
				testUpdate: false,
				testRemove: false,
				testInsert: false,
				testCommitNoChannel: false,
				testCommitDoNothing: false,
				testCommitReplace: false,
				testCommitUpdate: false,
				testCommitCondensed: false,
				testRejectMultiple: false,
				testRejectSingle: false
			} 
		}, 
		
		
		testIndex : function() {
			var i, len, idx = JSORM.db.index.hash(["name"]);
			for (i=0, len=initval.length; i<len; i++) {
				idx.add(i,initval[i]);
			}
			r = idx.find({field: "name", compare: "equals", value: "Jill"});
			Y.Assert.isObject(r,"r returned should be an array");
			Y.Assert.areEqual(1,r.length,"Indexed name field search should return single record");

			r = idx.find({field: "name", compare: "gt", value: 25});
			Y.Assert.isNull(r,"Greater than should return null");

			r = idx.find({field: "age", compare: "gt", value: 25});	
			Y.Assert.isNull(r,"Unindexed field should return null");			
		},
		testJsonParser : function() {
			var parser, j, d;

			// set up a parser, with a root of root
			parser = JSORM.db.parser.json({root: "root"});

			d = parser.read(jsonO);

			// check that the results are as expected
			Y.Assert.areEqual(5,d.records.length,"Parse object json records expected");
			//[{name:"John",age:25},{name:"Jill",age:18},{name:"Jack",age:60},{name:"Jeri",age:45},{name:"Jono",age:12}];
			Y.Assert.areEqual("John",d.records[0].name,"John is first");
			Y.Assert.areEqual(25,d.records[0].age,"John has age 25");
			Y.Assert.areEqual("Jono",d.records[4].name,"Jono is last with age 12");
			Y.Assert.areEqual(12,d.records[4].age,"Jono is last with age 12");

			d = parser.read(jsonA);

			// check that the results are as expected
			Y.Assert.areEqual(5,d.records.length,"Parse object json records expected");
			//[{name:"John",age:25},{name:"Jill",age:18},{name:"Jack",age:60},{name:"Jeri",age:45},{name:"Jono",age:12}];
			Y.Assert.areEqual("John",d.records[0].name,"John is first with age 25");
			Y.Assert.areEqual(25,d.records[0].age,"John is first with age 25");
			Y.Assert.areEqual("Jono",d.records[4].name,"Jono is last with age 12");
			Y.Assert.areEqual(12,d.records[4].age,"Jono is last with age 12");

			// go to write
			j = parser.write(d.records);
			Y.Assert.isTrue(JSORM.compare(JSON.parse(jsonO),JSON.parse(j)),"object to json should be equal");

		},

		testHttpChannelLoadUrl : function() {
			var channel, loadcb, test=this;
			var expected = {
				"meta": {"root": "root", "id":"uid"},
				"root":
					[
						{"name":"John","age":25, "uid": 10},
						{"name":"Jill","age":18, "uid": 11},
						{"name":"Jack","age":60, "uid": 12},
						{"name":"Jeri","age":45, "uid": 13},
						{"name":"Jono","age":12, "uid": 14}
					]
				};
			loadcb = function(data) {
				test.resume(function() {
					Y.Assert.areEqual(JSON.stringify(expected),JSON.stringify(JSON.parse(data.response)),"loadUrl Json");
				});
			}
			// test load with loadUrl
			channel = JSORM.db.channel.http({loadUrl: 'data.json'});
			channel.load({callback: loadcb});
			this.wait(3000);
		},

		testHttpChannelUrl : function() {
			var channel, loadcb, test=this;
			var expected = {
				"meta": {"root": "root", "id":"uid"},
				"root":
					[
						{"name":"John","age":25, "uid": 10},
						{"name":"Jill","age":18, "uid": 11},
						{"name":"Jack","age":60, "uid": 12},
						{"name":"Jeri","age":45, "uid": 13},
						{"name":"Jono","age":12, "uid": 14}
					]
				};
			loadcb = function(data) {
				test.resume(function() {
					Y.Assert.areEqual(JSON.stringify(expected),JSON.stringify(JSON.parse(data.response)),"url Json");
				});
			}
			// test load with just url
			channel = JSORM.db.channel.http({url: 'data.json'});
			channel.load({callback: loadcb});
			test.wait(3000);

		},

		testLoad : function() {
			var test = this, db, cb;
			cb = function() {
				test.resume(function(){
					// check results
					r = db.find();
					Y.Assert.areEqual(initval.length,r.length,"Number of entries in the database");					
				});
			}
			db = this.createDbPlain(cb);
			this.wait(3000);
		},

		testFind : function() {
			var test = this, db, cb;
			cb = function() {
				test.resume(function(){
					// check results
					r = db.find();
					Y.Assert.areEqual(initval.length,r.length,"Number of entries in the database");

					r = db.find({where: {field: "age", compare: "ge", value: 25}});
					Y.Assert.areEqual(3,r.length,"Number of entries where age >= 25");

					r = db.find({where: {field: "age", compare: "ge", value: 25}, fields: {name: true}});
					Y.Assert.areEqual(3,r.length,"Number of entries where age >= 25");
					Y.Assert.isNotUndefined(r[0].name,"Should have name for age >= 25");
					Y.Assert.isNotUndefined(r[1].name,"Should have name for age >= 25");
					Y.Assert.isNotUndefined(r[2].name,"Should have name for age >= 25");
					Y.Assert.isUndefined(r[0].age,"Should not have other than name for age >= 25");
					Y.Assert.isUndefined(r[1].age,"Should not have other than name for age >= 25");
					Y.Assert.isUndefined(r[2].age,"Should not have other than name for age >= 25");

					r = db.find({where: {field: "age", compare: "gt", value: 2}});
					Y.Assert.areEqual(10,r.length,"Number of entries where age > 2");

					r = db.find({where: {field: "age", compare: "gt", value: 2,type:'person'}});
					Y.Assert.areEqual(5,r.length,"Number of PERSON entries where age > 2");

					r = db.find({where:{field: "age", compare: "gt", value: 2},fields:{age: true}});
					Y.Assert.areEqual(10,r.length,"Number of entries where age > 2");
					Y.Assert.isNotUndefined(r[0].age,"Should have age for age >= 25");
					Y.Assert.isNotUndefined(r[1].age,"Should have age for age >= 25");
					Y.Assert.isNotUndefined(r[2].age,"Should have age for age >= 25");
					Y.Assert.isUndefined(r[0].name,"Should not have other than age for age >= 25");
					Y.Assert.isUndefined(r[1].name,"Should not have other than age for age >= 25");
					Y.Assert.isUndefined(r[2].name,"Should not have other than age for age >= 25");

					r = db.find({where:{join: "and", terms:[{field: "age", compare: "gt", value: 2}]}});
					Y.Assert.areEqual(10,r.length,"Number of entries where age > 2 and an and term");

					r = db.find({where: {join: "and", terms:[{field: "age", compare: "gt", value: 2},{field: "name", compare: "starts", value: "Jo"}]}});
					Y.Assert.areEqual(2,r.length,"Number of entries where age > 2 AND name starts 'Jo'");

					r = db.find({where: {join: "or", terms:[{field: "age", compare: "gt", value: 22},{field: "name", compare: "starts", value: "Ji"}]}});
					Y.Assert.areEqual(4,r.length,"Number of entries where age > 22 OR name starts 'Ji'");
					
					r = db.find({where: {join: "or", terms:[{field: "age", compare: "gt", value: 22},{join: 'and', terms:[{field: "name", compare: "starts", value: "Ji"},{field:'age',compare:'equals',value:18}]}]}});
					Y.Assert.areEqual(4,r.length,"Number of entries where age > 22 OR (name starts 'Ji' AND age == 18)");

					r = db.find({where: {field: "age",compare:"notnull", type:"car"}});
					Y.Assert.areEqual(5,r.length,"Number of entries where type = car");
				});
			}
			db = this.createDbPlain(cb);
			this.wait(3000);
		},

		testUpdate : function() {
			var test=this, db, cb;
			cb = function() {
				test.resume(function(){
					db.update({data: {age: 30}, where: {field: "age",compare:"gt",value:23}});

					r = db.find({where: {field: "age", compare: "gt", value: 25}});
					Y.Assert.areEqual(r.length,3,"Number of entries where age > 25 after update");

					r = db.find({where: {field: "age", compare: "equals", value: 30}});	
					Y.Assert.areEqual(r.length,3,"Number of entries where age == 30 after update");					
				});
			}
			db = this.createDbPlain(cb);
		},

		testRemove : function() {
			var test=this, db, cb;
			cb = function() {
				test.resume(function(){
					db.remove({where: {field: "name", compare: "equals", value: "Jill"}});
					r = db.find();
					Y.Assert.areEqual(9,r.length,"Removed Jill, should have 9 records");

					db.remove({where: {field: "name", compare: "equals", value: "Joshua"}});
					r = db.find();
					Y.Assert.areEqual(9,r.length,"Removed Joshua, should still have 9 records");
				});
			}
			db = this.createDbPlain(cb);
			this.wait(3000);
		},

		testInsert : function() {
			var test=this, db, cb;
			cb = function() {
				test.resume(function(){
					db.insert(newval);
					r = db.find();
					Y.Assert.areEqual(15,r.length,"Added newval without replace");

					db.clear();
					db.insert(newval);
					r = db.find();
					Y.Assert.areEqual(5,r.length,"Added newval alone");	
				});
			}
			db = this.createDbPlain(cb);
			this.wait(3000);
		},

		testCommitNoChannel : function() {
			var test=this, db, cb;
			cb = function() {
				test.resume(function(){
					db.update({data: {age: 30}, where: {field: "age",compare:"gt",value:23}});
					db.insert(newval);
					db.commit();
				});
			}
			db = this.createDbPlain(cb);
			this.wait(3000);
		},
		testCommitDoNothing : function() {
			var test=this, db, cb;
			cb = function() {
				test.resume(function(){
					db.update({data: {age: 30}, where: {field: "age",compare:"gt",value:23}});
					db.insert(newval);
					db.commit({mode: JSORM.db.db.modes.nothing});
				});
			}
			db = this.createDbChannel(cb);
			this.wait(3000);
		},
		testCommitReplace : function() {
			var test=this, db, cb;
			cb = function() {
				test.resume(function(){
					db.update({data: {age: 30}, where: {field: "age",compare:"gt",value:23}});
					db.insert(newval);
					db.commit({mode: JSORM.db.db.modes.replace});
				});
			}
			db = this.createDbChannel(cb);
			this.wait(3000);
		},
		testCommitUpdate : function() {
			var test=this, db, cb;
			cb = function() {
				test.resume(function(){
					db.update({data: {age: 30}, where: {field: "age",compare:"gt",value:23}});
					db.insert(newval);
					db.commit({mode: JSORM.db.db.modes.update});
				});
			}
			db = this.createDbChannel(cb);
			this.wait(3000);
		},
		testCommitCondensed : function() {
			var test=this, db, cb;
			cb = function() {
				test.resume(function(){
					db.update({data: {age: 30}, where: {field: "age",compare:"gt",value:23}});
					db.insert(newval);
					db.update({data: {name: "Josh"}, where: {field: "name", compare: "equals", value: "John"}});
					db.update({data: {age: 27}, where: {field: "name", compare: "equals", value: "Karl"}});
					db.remove({where: {field: "name", compare: "equals", value: "Kelly"}});
					db.commit({mode: JSORM.db.db.modes.condensed});
				});
			}
			db = this.createDbChannel(cb);
			this.wait(3000);
		},

		testRejectMultiple : function() {
			var test=this, db, db;
			cb = function() {
				test.resume(function(){
					db.update({data: {age: 30}, where: {field: "age",compare:"gt",value:23}});
					r = db.find({where: {field: "age", compare: "equals", value: 60}});
					Y.Assert.areEqual(0,r.length,"Before reject should have none at age 60");
					db.insert(newval);
					r = db.find({where: {field: "age", compare: "equals", value: 60}});
					Y.Assert.areEqual(1,r.length,"Before reject should have one at age 60");
					db.reject(2);
					r = db.find({where: {field: "age", compare: "equals", value: 60}});
					Y.Assert.areEqual(1,r.length,"After reject should have all changes rolled back");
				});
			}
			db = this.createDbPlain(cb);
			this.wait(3000);
		},

		testRejectSingle : function() {
			var test=this, db, db;
			cb = function() {
				test.resume(function(){
					db.update({data: {age: 30}, where: {field: "age",compare:"gt",value:23}});
					db.insert(newval);
					r = db.find({where: {field: "age", compare: "equals", value: 60}});
					Y.Assert.areEqual(1,r.length,"Before reject should have one at age 60");
					r = db.find();
					Y.Assert.areEqual(10,r.length,"Before reject should have 10 entries");
					db.reject(1);
					r = db.find({where: {field: "age", compare: "equals", value: 60}});
					Y.Assert.areEqual(0,r.length,"After reject of insert but not update should have none at age 60");
				});
			}
			db = this.createDbPlain(cb);
			this.wait(3000);
		}

		
	}));
}
