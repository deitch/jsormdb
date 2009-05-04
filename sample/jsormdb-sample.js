var SAMPLE = function() {
	var db1 = JSORM.db.db({parser: JSORM.db.parser.object()}), db2 = JSORM.db.db({
		channel: JSORM.db.channel.http({loadUrl: 'data.json'}),
		parser: JSORM.db.parser.json()
	});
	return {
		getDb1 : function() {return db1;},
		getDb2 : function() {return db2;},
		loadDb1 : function() {
			db1.load({data: [{name: "John", age: 25},{name: "Jill", age: 20},{name: "Jim", age: 35}]});
		},
		loadDb2 : function() {
			db2.load({});
		},
		changeDb1 : function() {
			var data, query, update;
			// add one record
			data = [{name: "Jerry", age: 40}];
			db1.insert(data);
			query = {field: "age", compare: "ge", value: 35};
			update = {age: 35};
			db1.update({data: update, where: query}); // for every record where the age >= 35, change the age to be 35; sounds nice!
			query = {field: "name", compare: "equals", value:"Jill"};
			db1.remove({where: query}); // remove every record where name == "Jill"	
		},

		changeDb2 : function() {
			var data, query, update;
			// add one record
			data = [{name: "Kim", age: 70}];
			db2.insert(data);
			query = {field: "age", compare: "ge", value: 60};
			update = {age: 50};
			db2.update({data: update, where: query}); // for every record where the age >= 60, change the age to be 50; sounds nice!
			query = {field: "name", compare: "equals", value:"Kara"};
			db2.remove({where: query}); // remove every record where name == "Kara"	
		},
		commitDb1 : function() {
			db1.commit();
		},
		commitDb2 : function() {
			db2.commit();
		},
		rejectDb1 : function() {
			db1.reject();
		},
		rejectDb2 : function() {
			db2.reject();
		}
		
	}
}();
