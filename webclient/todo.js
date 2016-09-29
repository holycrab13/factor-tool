
var pins = [];

var result = [];

var filters = []

var suggestions = [];

var searchObject;

var init = true;

var searchTerm = "";

var searchInput = $("#pin-input");

var autocompleteList = $('#pin-autocomplete');

setInterval(function() { 
	var input = searchInput.val();
	
	if(searchTerm != input) {
		searchTerm = input;
		searchInput.width(searchTerm.length * 15 + 30);
		
		autoComplete(searchTerm, autocompleteList);		
	}
	
}, 50);




function autoComplete(input, list) {
	

	var query = "http://localhost:8984/solr/factor_tool/select?indent=on&wt=json&q=" + encodeURIComponent(input);
	
	$.ajax({
		dataType: 'jsonp',
		jsonp: 'json.wrf',
		url: query,
		success: function(data) {    
		
			list.empty();
			suggestions = [];
			
			for(var i = 0; i < Math.min(10, data.response.docs.length); i++) {
				
				var suggestion = data.response.docs[i];
				suggestions.push(suggestion);				
				
			}
			
			printAutoComplete();
				
				
		},
		error: function(data) {
			
		}		
	});
}

$("#pin-input").keydown(function (e) {

	if (e.which == 9) {
	   e.preventDefault(); 
	   suggestions.shift();
	   printAutoComplete();
	}
});

$("#search-input").keydown(function (e) {

	if (e.which == 9) {
	   e.preventDefault(); 
	   
	   
	   suggestions.shift();
	   printAutoComplete();
	}
});


$("#pin-bar").click(function() {
	if(!$("#search-bar").hasClass("deco")) {
		$("#search-bar").addClass("deco");
		
		$("#pin-form").toggleClass("active");
		$("#pin-title").toggleClass("hide");
		$("#pin-marker").toggleClass("init");
		
		
		

	}
	
	$("#pin-input").focus();
});


$("#pin-form").submit(function( event ) {
	
	event.preventDefault();
	
	
	if(suggestions.length > 0) {
		
		$("#pin-form").toggleClass("active");
		$("#search-form").toggleClass("active");
		$("#search-bar").toggleClass("active");
		$("#pin-bar").toggleClass("active");
		$("#pin-title").toggleClass("hide");
		$("#pin-marker").toggleClass("active");
		
	
		$("#pin-title").html(suggestions[0].name);
		var pin = { text: suggestions[0].name, uri: suggestions[0].uri, isClass: true };

		searchObject = pin;	
		pushPin(pin);
		
		
		$("#search-bar").one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',   
			function(e) {
			if(init) {
				$("#background").toggleClass("active");
				
				searchInput = $("#search-input");
				autocompleteList = $("#autocomplete");
				
				$("#search-input").focus();
				search();
				init = false;
			}
		
		});  
	}
});

$("#search-form").submit(function( event ) {
	
	event.preventDefault();

	if(suggestions.length > 0) {
	
		$("#search-input").val("");
		var pin = { text: suggestions[0].name, uri: suggestions[0].uri, isClass: true };

		pushPin(pin);
		findFilters();
	}
});

function search() {
	
	result = [];
	filters = [];
	
	findFilters();
	
	//Build a query from the search object
	var query = "SELECT distinct ?s WHERE { ?s a <" + searchObject.uri + ">. } limit 200";
	
	
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query);
	//Send out the query via ajax
	$.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    
		
			
			//Iterate over the results and add them to the result set
			for(i in data.results.bindings) {
				//Retrieve the uri
				var resultUri = data.results.bindings[i]["s"]["value"];
				//Extract the actual name from the uri
				var resultText = resultUri.split('\\').pop().split('/').pop().split('_').join(' ');
				result.push({ text: resultText, uri: resultUri, icon_url: 'img_avatar2.png', isClass: false });
			}
			
			printResults();
		},
		error: function(data) {
			$('#result-list').empty();
		}		
	});
}

function pushPin(pin) {
	pins.push(pin);
	printPins();
}


function printPins() {
	var list = $('#pin-list')
	list.empty();
	
	$.each(pins, function( index, value ) {
		var listItem = $('<li/>')
			.addClass('pin-item')
			.attr('id', 'pin-' + value.text)
			.appendTo(list);
		var text = $('<a/>')
			.text(value.text)
			.appendTo(listItem);
			
		listItem.click(function() {
			var index = $(this).index();
			
			$("#pin-title").html(pins[index].text);
			$("#pin-marker").animate({ top: 51 * index }, 300, function() {
				if(searchObject != pins[index]) {
					searchObject = pins[index];	
					search();
				}
			});
		});
	});

}

function printAutoComplete() {
	
	autocompleteList.empty();
	
	$.each(suggestions, function( index, value ) {
		var listItem = $('<li/>')
			.appendTo(autocompleteList);
		var text = $('<a/>')
			.text(value.name)
			.appendTo(listItem);
			
	});
	
}

function printResults() {
	var list = $('#result-list');
	list.empty();
		
	$.each(result, function( index, value ) {
		var listItem = $('<li/>')
			.addClass('result-item')
			.attr('id', 'pin-' + value.text)
			.appendTo(list);
		var text = $('<a/>')
			.text(value.text)
			.appendTo(listItem);
			
		listItem.click(function() {
			pushPin(value);
			findFilters();
		});
	});
	
}

function printFilters() {
	var list = $('#filter-list');
	list.empty();
	
	$.each(filters, function( index, value ) {
		var listItem = $('<li/>')
			.addClass('filter-item')
			.attr('id', 'pin-' + value.text)
			.appendTo(list);
			
		if(value.passive == 'true') {
			var text = $('<a/>')
				.text(searchObject.text + " with " + value.text + " being " + value.target.text)
				.appendTo(listItem);
		} else {
			var text = $('<a/>')
				.text(searchObject.text + " being " + value.text + " of " + value.target.text)
				.appendTo(listItem);
			
		}
		
		listItem.click(function() {
			value.active = !value.active;
		});
	});
	
}

function findFilters() {
	
	filters = [];
	
	if(searchObject != null && searchObject.isClass) {
		
		$.each(pins, function( index, value ) {
			if(value.isClass) {
				findTypeFilters(value, searchObject);
			} else {
				findInstanceFilters(value, searchObject);
			}
		});
	} else {
		printFilters();
	}
}

function findTypeFilters(targetType, type) {
	var query = "SELECT distinct ?p ?x WHERE { { ?s ?p ?o BIND('true' AS ?x). ?s a <" + type.uri + ">. ?o a <" + targetType.uri + ">. } " + 
		"UNION { ?o ?p ?s BIND('false' AS ?x). ?s a <" + type.uri + ">. ?o a <" + targetType.uri + ">. } FILTER regex(?p, 'dbpedia.org/ontology')  }";
		
		
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query) +"&format=json";

	queryFilters(queryUrl, targetType);
}

function findInstanceFilters(instance, type) {	
	var query = "SELECT distinct ?p ?x WHERE { { ?s ?p <" + instance.uri + "> BIND('true' AS ?x). ?s a <" + type.uri 
		+ ">. } UNION { <" + instance.uri + "> ?p ?s BIND('false' AS ?x). ?s a <" 
		+ type.uri + ">. } FILTER regex(?p, 'dbpedia.org/ontology')  }";
		
		
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query) +"&format=json";

	queryFilters(queryUrl, instance);
}

function queryFilters(queryUrl, targetObject) {
	$.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    
			//Iterate over result set
			for(i in data.results.bindings) {
				//Get the result uri
				var resultUri = data.results.bindings[i]["p"]["value"];
				var resultPassive = data.results.bindings[i]["x"]["value"];
				//Get the property name from the uri
				var resultText = resultUri.split('\\').pop().split('/').pop().replace(/([a-z](?=[A-Z]))/g, '$1 ').replace(/([A-Z])/g, function(str){ return str.toLowerCase(); });
				
				filters.push({ text: resultText, uri : resultUri, active: false, passive: resultPassive, target: targetObject});
			}
			
			
			printFilters();
		},
		error: function(data) {
			printFilters();
		}
	});
}

