
var autocompleteSuggestions = [];

var suggestions_lookup = [];

var suggestions_solr = [];

var currentSuggestion;

var expandSuggestions = [];

var filterSuggestions = [];


// Runs the auto-complete for the text input
function autoComplete(searchTerm) {
	
	// Clear all suggestions
	autocompleteSuggestions = [];
	suggestions_solr = [];
	suggestions_lookup = [];
	
	// , getLookupSuggestions()
	$.when(getSolrSuggestions(), getLookupSuggestions()).done(function(solr, lookup) {
		
		$.each(suggestions_solr, function( index, solr_class ) {
		
			var suggestion = { name: solr_class.name, tokens: [] };

			suggestion.tokens.push({ name: solr_class.name, uri : solr_class.uri, type : solr_class.type });

			autocompleteSuggestions.push(suggestion);
		});

		
		$.each(suggestions_lookup, function( index, lookup_instance ) {
			
			var added = false;

			$.each(autocompleteSuggestions, function(index, autoSuggestion) {

				if(autoSuggestion.name == lookup_instance.name)
				{
					autoSuggestion.tokens.push({ name: lookup_instance.name, uri : lookup_instance.uri, type : lookup_instance.type });
					added = true;
				}

			});

			if(!added)
			{
				var suggestion = { name: lookup_instance.name, tokens: [] };

				suggestion.tokens.push({ name: lookup_instance.name, uri : lookup_instance.uri, type : lookup_instance.type });

				autocompleteSuggestions.push(suggestion);
			}
		});
		
	
		if(currentSuggestion == null || autocompleteSuggestions.length > 0 && autocompleteSuggestions[0].name != currentSuggestion.name)
		{
			currentSuggestion = autocompleteSuggestions[0];

			findSuggestions();
		}
		
		renderAutoComplete();
	});
}

function findSuggestions()
{
	filterSuggestions = [];
	expandSuggestions = [];

	$.each(currentSuggestion.tokens, function( index, token ) {
		
		if(token.type == "property")
		{
			$.when(preparePropertySuggestion(token)).done(function() {
				
				findPropertySuggestions(token);
				renderSuggestions();
			});
		}

		if(token.type == "class")
		{
			$.when(prepareClassSuggestion(token)).done(function() {

				findClassSuggestions(token);
				renderSuggestions();
			});
		}

		if(token.type == "instance")
		{
			findInstanceSuggestions(token);
			renderSuggestions();
		}
	});
}

function findClassSuggestions(currentSuggestion)
{
	if(!activeResultSet.isEmpty())
	{
		var description = getSetDescription(activeResultSet, null);

		if(hasMatch(currentSuggestion.classes, activeResultSet.classes))
		{
			filterSuggestions.push(
			{ 
				text: "Find {1} being a {0}".format(description, currentSuggestion.name),
				execute: function() {
					createClassFilter(currentSuggestion);
				}
			});
		}

		expandSuggestions.push(
		{ 
			text: "Find {1} related to {0}".format(description, currentSuggestion.name),
			execute: function() {
				createOpenExpand();
				createClassFilter(currentSuggestion);
				// createClassFilter(currentSuggestion);
			}
		});

	}
	else
	{
		filterSuggestions.push(
		{ 
			text: "Find {0}s".format(currentSuggestion.name),
			execute: function() {
				createClassFilter(currentSuggestion);
			}
		});
	}
}

function findPropertySuggestions(currentSuggestion)
{
	if(!activeResultSet.isEmpty())
	{
		var description = getSetDescription(activeResultSet, null);

		// check available suggestions
		if(hasMatch(currentSuggestion.domains, activeResultSet.classes))
		{
			filterSuggestions.push(
			{ 
				text: "Find {0}s having a {1}".format(description, currentSuggestion.name),
				execute: function() {
					createPropertyFilter(currentSuggestion, "");
				}
			});

			expandSuggestions.push(
			{ 
				text: "Find {0} being {1} of {2}".format(currentSuggestion.ranges.length > 0 ? currentSuggestion.ranges[0] : "thing", currentSuggestion.name, description),
				execute: function() {
					createPropertyExpand(currentSuggestion, "^");
				}
			});	
		}

		if(hasMatch(currentSuggestion.ranges, activeResultSet.classes))
		{
			filterSuggestions.push(
			{ 
				text: "Find {0}s being a {1}".format(description, currentSuggestion.name),
				execute: function() {
					createPropertyFilter(currentSuggestion, "^");
				}
			});	

			expandSuggestions.push(
			{ 
				text: "Find {0} with {1} being {2}".format(currentSuggestion.domains.length > 0 ? currentSuggestion.domains[0] : "thing", currentSuggestion.name, description),
				execute: function() {
					createPropertyExpand(currentSuggestion, "");
				}
			});	
		}
	}
	else
	{
		filterSuggestions.push(
		{ 
			text: "Find {0}s having a {1}".format(currentSuggestion.domains.length > 0 ? currentSuggestion.domains[0] : "thing", currentSuggestion.name),
			execute: function() {
				createPropertyFilter(currentSuggestion, "");
			}
		});

		filterSuggestions.push(
		{ 
			text: "Find {0}s being a {1}".format(currentSuggestion.ranges.length > 0 ? currentSuggestion.ranges[0] : "thing", currentSuggestion.name),
			execute: function() {
				createPropertyFilter(currentSuggestion, "^");
			}
		});	
	}
}

function findInstanceSuggestions(currentSuggestion)
{

	var description = getSetDescription(activeResultSet, null);

	filterSuggestions.push(
	{ 
		text: "Find {0} related to {1}".format(description, currentSuggestion.name),
		execute: function() {
			createInstanceFilter(currentSuggestion);
		}
	});
}

function preparePropertySuggestion(suggestion)
{
	suggestion.domains = [];
	suggestion.ranges = [];

    var query = "select ?c ?t where { { ?d rdfs:subClassOf* ?c. <{0}> rdfs:domain ?d. BIND('domain' as ?t). } UNION { ?r rdfs:subClassOf* ?c. <{0}> rdfs:range ?r. BIND('range' as ?t). }  FILTER(?c like <http://dbpedia.org/ontology/%>) }".format(suggestion.uri);
    var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query);

 	return $.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    
		
			//alert("query done");
			var currentResult;
			//Iterate over the results and add them to the result set
			for(i in data.results.bindings) {
				//Retrieve the uri
				var result = getText(data.results.bindings[i]["c"]["value"]);
				var resultType = data.results.bindings[i]["t"]["value"];

				if(resultType == "domain")
				{
					suggestion.domains.push(result);
				}

				if(resultType == "range")
				{
					suggestion.ranges.push(result);
				}
			}
			
		},
		error: function(data) {
		}		
	});
}

function prepareClassSuggestion(suggestion)
{
	suggestion.classes = [];

    var query = "select ?c where { <{0}> rdfs:subClassOf* ?c. FILTER(?c like <http://dbpedia.org/ontology/%>) }".format(suggestion.uri);
    var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query);
 	return $.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    
		
			//alert("query done");
			var currentResult;
			//Iterate over the results and add them to the result set
			for(i in data.results.bindings) {
				//Retrieve the uri
				var result = getText(data.results.bindings[i]["c"]["value"]);

				suggestion.classes.push(result);
			}
			
		},
		error: function(data) {
		}		
	});
}



// Get the auto-complete suggestions from dbpedia lookup
function getLookupSuggestions() {
	// Build the query...
	// var query = "SELECT ?x WHERE { FILTER regex(?x, '" + searchTerm + "'')}"

	var query = "http://127.0.0.7:1111/api/search/PrefixSearch?MaxHits=10&QueryString=" + encodeURIComponent(searchTerm);
	// var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query) +"&format=json";

	return $.ajax({
		dataType: 'json',
		url: query,
		success: function(data) {    
			// Read the result and add it to suggestions_lookup
			for(var i = 0; i < Math.min(10, data.results.length); i++) {
				suggestions_lookup.push({ name: formatName(data.results[i].label), uri : data.results[i].uri, type : "instance" });				
				
			}	
		},
		error: function(data) {
			
		}		
	});
}

// Get the auto-complete suggestions from the class solr index
function getSolrSuggestions() {
	// Build the query...
	
	var query = "http:/127.0.0.1:8984/solr/factor_tool/suggest?wt=json&q=" + encodeURIComponent(searchTerm);
	
	// Send and return the query result
	return $.ajax({
		dataType: 'jsonp',
		jsonp: 'json.wrf',
		url: query,
		success: function(data) {    
			// Read the result and add it to suggestions_solr
			var resultData = data.suggest.mySuggester[searchTerm].suggestions;
			
			for(var i = 0; i < Math.min(5, resultData.length); i++) {
				suggestions_solr.push({ name: resultData[i].term, uri : getUri(resultData[i].payload), type : getType(resultData[i].payload) });
			}				
		},
		error: function(data) {
			
		}		
	});

}


function hasMatch(listA, listB)
{
	return listA.length == 0 || listB.length == 0 || listA.indexOf(listB[0]) > -1 || listB.indexOf(listA[0]) > -1;
}
