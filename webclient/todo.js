
var pins = [];

var pinListItems = [];

var result = [];

var filters = []

var suggestions_all = [];

var suggestions_lookup = [];

var suggestions_solr = [];

var searchObject;

var leftObject;

var rightObject;

var init = true;

var searchTerm = "";

var searchInput = $("#search-input");

var autocompleteList = $('#autocomplete');

var searchReflexive = false;

// TODO: MERGE CLASS/INSTANCE MATCHES


setInterval(function() { 
	var input = searchInput.val();
	
	if(searchTerm != input) {
		searchTerm = input;
		
		var w = searchTerm.length * 12 + 30;
		if(w > 200) {
			$("#search-input").animate({ width: w }, 50);
		}
		
		autoComplete();		
	}
	
}, 50);


function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function toTitleCase(str) {
    return str.replace(/(?:^|\s)\w/g, function(match) {
        return match.toUpperCase();
    });
}

function formatName(str) {
    return toTitleCase(str).replace(/(\s)/g, "").replace( /([A-Z])/g, " $1" ).slice(1);
}


// Runs the auto-complete for the text input
function autoComplete() {
	
	// Clear all suggestions
	suggestions_lookup = [];
	suggestions_solr = [];
	suggestions_all = [];
	
	$.when(getSolrSuggestions(), getLookupSuggestions()).done(function(solr, lookup) {
		
		$.each(suggestions_solr, function( index, solr_class ) {
		
			var instUri = null;
			
			$.each(suggestions_lookup, function( index, lookup_instance ) {
				if(solr_class.name == lookup_instance.name) {
					instUri = lookup_instance.uri;
					lookup_instance.add = false;
				}
			});
			
			var suggestion = { name: solr_class.name, uri : solr_class.uri, isClass : true, instanceUri : instUri };
			suggestions_all.push(suggestion);
		});
		
		$.each(suggestions_lookup, function( index, lookup_instance ) {
			if(lookup_instance.add) {
				var suggestion = { name: lookup_instance.name, uri : lookup_instance.uri, isClass : false, instanceUri : null };
				suggestions_all.push(suggestion);
			}
		});	
		
		printAutoComplete();
	});
}

// Renders the auto complete
function printAutoComplete() {
	
	autocompleteList.empty();
	
	$.each(suggestions_all, function( index, value ) {
		
		if(value.isClass) {
			var listItem = $('<li/>')
			.appendTo(autocompleteList);
			var text = $('<a/>')
			.text(value.name)
			.addClass("font-bold")
			.appendTo(listItem);
		} else {
			var listItem = $('<li/>')
			.appendTo(autocompleteList);
			var text = $('<a/>')
			.text(value.name)
			.appendTo(listItem);
		}
	});
}

// Get the auto-complete suggestions from the class solr index
function getSolrSuggestions() {
	// Build the query...
	var query = "http://localhost:8984/solr/factor_tool/suggest?wt=json&q=" + encodeURIComponent(searchTerm);
	
	// Send and return the query result
	return $.ajax({
		dataType: 'jsonp',
		jsonp: 'json.wrf',
		url: query,
		success: function(data) {    
			// Read the result and add it to suggestions_solr
			var resultData = data.suggest.mySuggester[searchTerm].suggestions;
			
			for(var i = 0; i < Math.min(5, resultData.length); i++) {
				suggestions_solr.push({ name: formatName(resultData[i].term), uri : resultData[i].payload, add : true });
			}				
		},
		error: function(data) {
			
		}		
	});
}

function getLookupSuggestions() {
	// Build the query...
	var query = "http://lookup.dbpedia.org/api/search/PrefixSearch?MaxHits=10&QueryString=" + encodeURIComponent(searchTerm);
	
	return $.ajax({
		dataType: 'json',
		url: query,
		success: function(data) {    
			// Read the result and add it to suggestions_lookup
			for(var i = 0; i < Math.min(10, data.results.length); i++) {
				suggestions_lookup.push({ name: formatName(data.results[i].label), uri : data.results[i].uri, add : true });				
				
			}	
		},
		error: function(data) {
			
		}		
	});
}

$("#toggle-reflexive").click(function () {
	searchReflexive = !searchReflexive;
	$("#toggle-reflexive").toggleClass("on");
	findFilters();
});


$("#search-input").keydown(function (e) {

	if (e.which == 9) {
	   e.preventDefault(); 
	   
	   if(suggestions_all.length > 0) {
			suggestions_all.shift();
	   }
	   
	   printAutoComplete();
	}
});


$("#content").click(function() {
	if($("#search-input").hasClass("hidden")) {
		$("#search-input").toggleClass("hidden");
		$("#search-icon").toggleClass("hidden");
		
		$("#search-bar").animate({ width: 100 + '%' }, 300, function() {
			$("#search-input").animate({ width: 200 }, 300, function() {
				$("#search-input").focus();
			});
			
		});	
	}	
});




$("#search-bar").submit(function( event ) {
	
	event.preventDefault();

	if(suggestions_all.length > 0) {
		
		if(pins.length == 0) {
			$("#content").animate({ marginTop: 0 }, 300, function() {
				
			});
			
			$("#logo").animate({ height: 50 }, 300, function() {
				
			});
			
			$("#pin-section").toggleClass("hidden");

		}
		
		$("#search-input").val("");
		
		var suggestion = suggestions_all[0];
		
		var pin = { text: suggestion.name, uri: suggestion.uri, isClass: suggestion.isClass, instanceUri : suggestion.instanceUri };

		
		pushPin(pin);
		findFilters ();
	}
});

function search() {
	
	result = [];
	
	if(searchObject == null || !searchObject.isClass) {
		printResults();
		return;
	}
	
	//Build a query from the search object
	var query = "SELECT distinct ?s WHERE { ?s a <" + searchObject.uri + ">.";
	
	var i = 0;
	
	$.each(filters, function( index, value ) {
		
		if(value.active) {
			
			if(value.inverse) {
				query += " FILTER NOT EXISTS {";
			}
			
			if(!value.target.isClass) {
				if(value.passive == 'false') { 
					query += " <" + value.target.uri + "> <" + value.uri + "> ?s.";
				} else {
					query += " ?s <" + value.uri + "> <" + value.target.uri + ">.";
				}
			} else {
				var o = " ?o" + i;
				
				if(value.passive == 'false') {
					query += o + " <" + value.uri + "> ?s." + o + " a <" + value.target.uri + ">."
				} else {
					query += " ?s <" + value.uri + "> " + o + " ." + o + " a <" + value.target.uri + ">."
				}
				
				i++;
			}
			
			if(value.inverse) {
				query += "} ";
			}
		}
	
	});
	
	query += "} limit 200"
	
		
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
			printResults();
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

	if(pins.length == 0) {
		$('#pin-section').addClass('hidden');
	} else {
		$('#pin-section').removeClass('hidden');
	}
	
	$.each(pins, function( index, value ) {
		
		var listItem = $('<li/>')
			.addClass('list-item')
			.attr('id', 'pin-' + index)
			.appendTo(list);
		if(value.isClass) {
			var text = $('<a/>')
			.text(value.text + " (Class)")
			.appendTo(listItem)
			.addClass('list-item-text');
		} else {
			var text = $('<a/>')
			.text(value.text)
			.appendTo(listItem)
			.addClass('list-item-text');
		}
		var remove = $('<i/>')
			.text('clear')
			.appendTo(listItem)
			.addClass('remove-button material-icons');
			
			
		remove.click(function() {

			if(searchObject == pins[index]) {
				searchObject = null;
			}			

			pins.splice(index, 1);
			printPins();

			findFilters();
			search();	
		});
	
		listItem.click(function() {
			
			searchObject = pins[index];
			
			togglePin('pin-' + index);
	
			findFilters();
			search();						
			
		});
		
		if(searchObject != null && searchObject.uri == pins[index].uri) {
			togglePin('pin-' + index);
		}
	
			
	
	});
}

function togglePin(id) {
	var list = $('#pin-list').find('.active');
	list.removeClass('active');
	$('#' + id).addClass('active');	
}





function printResults() {
	var list = $('#result-list');
	list.empty();
	
	if(result.length == 0 ) {
		$('#result-section').addClass('hidden');
	} else {
		$('#result-section').removeClass('hidden');
	}
		
	$.each(result, function( index, value ) {
		var listItem = $('<li/>')
			.addClass('list-item')
			.attr('id', 'result-' + value.text)
			.appendTo(list);
		var text = $('<a/>')
			.text(value.text)
			.appendTo(listItem)
			.addClass('list-item-text');
			
		listItem.click(function() {
			pushPin(value);
			findFilters();
		});
	});
	
}



function sortFilters(prop, asc) {
    filters = filters.sort(function(a, b) {
        if (asc) {
            return (a[prop] > b[prop]) ? 1 : ((a[prop] < b[prop]) ? -1 : 0);
        } else {
            return (b[prop] > a[prop]) ? 1 : ((b[prop] < a[prop]) ? -1 : 0);
        }
    });
}

function printFilters() {
	var list = $('#filter-list');
	list.empty();
	
	if(filters.length == 0) {
		$('#filter-section').addClass('hidden');
	} else {
		$('#filter-section').removeClass('hidden');
	}
	
	sortFilters("count", false);
	
	$.each(filters, function( index, value ) {
	
		var listItem = $('<li/>')
			.addClass('list-item')
			.attr('id', 'filter-' + index)
			.appendTo(list);
		
		
		if(filters[index].passive == 'true') {
			var text = $('<a/>').text(searchObject.text + " with " + filters[index].text + " being " + filters[index].target.text + " (" + filters[index].count + " results)")
			.addClass('list-item-text').appendTo(listItem);
		} else {
			var text = $('<a/>').text(searchObject.text + " being " + filters[index].text + " of " + filters[index].target.text + " (" + filters[index].count + " results)")
			.addClass('list-item-text').appendTo(listItem);
		}
		
		var negate = $('<i/>')
			.text('add')
			.appendTo(listItem)
			.addClass('remove-button material-icons');
			
		
		
		listItem.click(function() {
			if(!filters[index].active) {
				filters[index].active = true;
				filters[index].inverse = false;
				negate.html('add');
				$(this).toggleClass('active');	
			} else if(!filters[index].inverse) {
				filters[index].inverse = true;
				negate.html('remove');
			} else {
				$(this).toggleClass('active');	
				filters[index].active = false;
			}
			

			search();	
		});

	});
	
	
}


function findFilters() {
	
	filters = [];
	
	if(searchObject != null && searchObject.isClass && !(pins.length == 1 && !searchReflexive)) {
		
		
		$.each(pins, function( index, value ) {
			
			if(value != searchObject || searchReflexive) {
				if(value.isClass) {
					findTypeFilters(value, searchObject);
					
					if(value.instanceUri != null) {
						findInstanceRepresentationFilters(value, searchObject);
					}
				} else {
					findInstanceFilters(value, searchObject);
				}
			}
			
		});
		
	} else {
		printFilters();
	}
}



function findTypeFilters(targetType, type) {
	
	// FILTER HERE
	var query = "SELECT distinct ?p ?x (count(?p) as ?c) WHERE { { ?s ?p ?o BIND('true' AS ?x). ?s a <" + type.uri + ">. ?o a <" + targetType.uri + ">. } " + 
		"UNION { ?o ?p ?s BIND('false' AS ?x). ?s a <" + type.uri + ">. ?o a <" + targetType.uri + ">. } FILTER regex(?p, 'dbpedia.org/ontology')  }";
		
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query) +"&format=json";

	queryFilters(queryUrl, targetType);
}

function findInstanceFilters(instance, type) {	
	var query = "SELECT distinct ?p ?x (count(?p) as ?c) WHERE { { ?s ?p <" + instance.uri + "> BIND('true' AS ?x). ?s a <" + type.uri 
		+ ">. } UNION { <" + instance.uri + "> ?p ?s BIND('false' AS ?x). ?s a <" 
		+ type.uri + ">. } FILTER regex(?p, 'dbpedia.org/ontology')  }";
		
		
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query) +"&format=json";

	queryFilters(queryUrl, instance);
}

function findInstanceRepresentationFilters(targetType, type) {	
	var query = "SELECT distinct ?p ?x (count(?p) as ?c) WHERE { { ?s ?p <" + targetType.instanceUri + "> BIND('true' AS ?x). ?s a <" + type.uri 
		+ ">. } UNION { <" + targetType.InstanceUri + "> ?p ?s BIND('false' AS ?x). ?s a <" 
		+ type.uri + ">. } FILTER regex(?p, 'dbpedia.org/ontology')  }";
		
		
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query) +"&format=json";

	queryFilters(queryUrl, targetType);
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
				var resultCount = parseInt(data.results.bindings[i]["c"]["value"]);
				//Get the property name from the uri
				var resultText = resultUri.split('\\').pop().split('/').pop().replace(/([a-z](?=[A-Z]))/g, '$1 ').replace(/([A-Z])/g, function(str){ return str.toLowerCase(); });
				
				filters.push({ text: resultText, uri : resultUri, count : resultCount, active: false, passive: resultPassive, target: targetObject, inverse: false});
			}
			
			
			printFilters();
		},
		error: function(data) {
			printFilters();
		}
	});
}

