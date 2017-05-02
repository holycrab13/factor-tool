// property index for query generation
var propertyIndex = 0;

var ontologyFilter = "FILTER regex(?p, 'http://dbpedia.org/ontology')";

// Creates a new result set
function createNewResultSet(baseSet)
{
	// resultSet(base, filters, expands, results)
	var resultSet = 
	{ 
		base : baseSet,
		filters : [], 
		expands: [],
		results : [],
		relatedSets: []
	}

	return resultSet;
}

// Create a new filter from an instance
function createFilter(resultSet, instance)
{
	if(resultSet == null)
		return;
	// create the filter object

	// SWITCH TYPE (Indicators???)
	if(instance.uri.includes("property"))
	{
		var filter =
		{
			name: instance.name,
			uri: instance.uri,
			type: "property",
			createQuery : function(index)
			{
				return "?s{0} <{1}>|^<{1}> ?o{2}. ".format(index, this.uri, ++propertyIndex);
			}

		}

		addFilter(resultSet, filter);
	}
	else if(instance.uri.includes("resource"))
	{
		// CREATE FILTER BASED ON AN INSTANCE
		var filter = 
		{
			name: instance.name,
			uri: instance.uri,
			properties: [],
			type: "instance",
			currentProperty: null,
			createQuery : function(index) {
				if(this.currentProperty.uri != null)
				{
					return "?s{0} {1}<{2}> <{3}>. ".format(index, this.currentProperty.dir, this.currentProperty.uri, this.uri);
				}
				else
				{
					return "{ ?s{0} ?p{1} <{2}>. } UNION { <{2}> ?p{1} ?s{0}. }. ".format(index, ++propertyIndex, this.uri);
				}
			}
		}

		// Wait for the query property result and add the filter
		$.when(queryProperties(filter)).done(function() {
			addFilter(resultSet, filter);
		});
	}
	else if(instance.uri.includes("ontology"))
	{
		// CREATE FILTER BASED ON A CLASS
		var filter =
		{
			name: instance.name,
			uri: instance.uri,
			type: "class",
			createQuery : function(index)
			{
				return "?s{0} a <{1}>. ".format(index, this.uri);
			}
		}

		addFilter(resultSet, filter);
	}
	else
	{
		var filter =
		{
			name: instance.name,
			uri: instance.uri,
			tpye: "literal",
			createQuery : function(index)
			{
				return "?s{0} ?p{1} ?v. FILTER(?v = {2})".format(index, ++propertyIndex, this.name);
			}
		}

		addFilter(resultSet, filter);
	}
}

// Query the properties for a certain filter
function queryProperties(filter)
{
	// Generate the query
	var inner = "{ ?s ?p <{0}> BIND('' as ?dir) } UNION { <{0}> ?p ?s BIND('^' as ?dir) }".format(filter.uri);
	var query = "SELECT distinct ?p ?dir WHERE { {0}  } ORDER BY DESC(count(?p)) LIMIT 15 ".format(inner);
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query={0}&format=json".format(encodeURIComponent(query));

	// Send the AJAX request
	return $.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    

			// Create the default property "all"
			filter.properties = [];
			filter.properties.push({ name: "related to", uri: null });
			filter.currentProperty = filter.properties[0];
			
			// Add the queried properties
			for(i in data.results.bindings) {
				//Get the result uri
				var resultUri = data.results.bindings[i]["p"]["value"];
				var resultDir = data.results.bindings[i]["dir"]["value"];
				var resultName = resultUri.split('\\').pop().split('/').pop().replace(/([a-z](?=[A-Z]))/g, '$1 ').replace(/([A-Z])/g, function(str){ return str.toLowerCase(); });

				filter.properties.push({ name: resultName, uri: resultUri, dir: resultDir });
			}

		},
		error: function(data) {
		}
	});
}

// Adds a filter and updates the current set
function addFilter(resultSet, filter)
{
	resultSet.filters.push(filter);
	update(resultSet);
}

// Adds an expand and updates the current set
function addExpand(resultSet, expand)
{
	resultSet.expands.push(expand);
	update(resultSet);
}

// Generates the query, sends the query and calls for a GUI update for the given result set
function update(resultSet)
{
	// Clear the current results
	resultSet.results = [];
	resultSet.relatedSets = [];

	// search & render
	$.when(search(resultSet), searchExpands(resultSet)).done(function() {
		render();
	});
}

// Generates and sends the search query and fills the result list
function search(resultSet)
{
	propertyIndex = 0;

	var query = "select ?s0 where { {0} } ORDER BY DESC(count(?s0)) LIMIT 100".format(generateQuery(resultSet, 0));

	$("#query_output").val(query);

	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query);
	//Send out the query via ajax
	return $.ajax({
		dataType: 'json',
		url: queryUrl,
		success: function(data) {    
		
			//alert("query done");
			var currentResult;
			//Iterate over the results and add them to the result set
			for(i in data.results.bindings) {
				//Retrieve the uri
				var resultUri = data.results.bindings[i]["s0"]["value"];
				var resultName = getText(resultUri);

				resultSet.results.push({ name: resultName, uri: resultUri, relations: [] });
			}
			
		},
		error: function(data) {
		}		
	});
	
}

// Recursively generates the sparql query
function generateQuery(resultSet, index)
{
	if(resultSet.base == null)
	{
	 	return "{0} FILTER(regex(?s0, 'resource'))".format(generateFilterQuery(resultSet.filters, index));
	}
	else
	{
		var result = "";

		result += generateFilterQuery(resultSet.filters, index);
		result += generateExpandQuery(resultSet.expands, index);

		return result + generateQuery(resultSet.base, index + 1);
	}
}

// Generates the subquery for a list of filters
function generateFilterQuery(filters, index)
{
	var result = "";

	$.each(filters, function(i, value) {

		result += value.createQuery(index);

	});

	return result;
}
 
// Generates the subquery for a list of expands
function generateExpandQuery(expands, index)
{
	var result = "";

	$.each(expands, function(i, value) {

		if(result != "")
		{
			result += "UNION ";
		}

		result += "{ ?s{0} {1}<{2}> ?s{3} } ".format(index, value.dir, value.uri, index + 1);
	});

	return result;
}

// Searches for possible expands
function searchExpands(resultSet)
{

	var inner = "select ?s0 where { {0} } ORDER BY DESC(count(?s0)) LIMIT 1000".format(generateQuery(resultSet, 0));
	var filters = " FILTER (!regex(?p, '(wiki|w3|xmlns|purl|property)'))"

	var query = "select ?p ?dir count(?p) as ?c where { { ?s ?p ?s0 BIND('' as ?dir) } UNION { ?s0 ?p ?s BIND('^' as ?dir) } { {0} } {1} } ORDER BY DESC(count(?p)) LIMIT 100".format(inner, filters);

	$("#related_output").val(query);
	
	var queryUrlProperties = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query="+ encodeURIComponent(query);
	//Send out the query via ajax
	return $.ajax({
		dataType: 'json',
		url: queryUrlProperties,
		success: function(data) {    
		
			for(i in data.results.bindings) {
				
				var resultCount = data.results.bindings[i]["c"]["value"]
				var resultUri = data.results.bindings[i]["p"]["value"];
				var resultDir = data.results.bindings[i]["dir"]["value"];
				var resultName = resultUri.split('\\').pop().split('/').pop().split('_').join(' ');

				resultSet.relatedSets.push({ name: resultName, uri: resultUri, dir: resultDir, count: resultCount });
			}
			
		},
		error: function(data) {
		}		
	});
	
}
