
function trace(resultSet, result, node)
{
	$.each(resultSet.expands, function(index, value) {
		renderExpand(node, result, value, resultSet);

	});

	$.each(resultSet.filters, function(index, value) {
		renderProperty(node, result, value);

	});
}


function renderProperty(node, result, filter)
{
	if(filter.type == "instance")
	{
		var query = "SELECT DISTINCT ?p WHERE { { <{0}> ?p <{1}> } UNION { <{1}> ?p <{0}> } FILTER regex(?p, 'http://dbpedia.org/ontology') }".format(result.uri, filter.uri);
		var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=" + encodeURIComponent(query);

		$.ajax({
			dataType: 'json',
			url: queryUrl,
			success: function(data) {  
			  
				var k = 0;

				for(i in data.results.bindings) {

					if(k < 3)
					{
						var resultUri = data.results.bindings[i]["p"]["value"];
						var resultText = resultUri.split('\\').pop().split('/').pop().split('_').join(' ');
						var text = $('<a/>')
						.text("{0} {1}".format(resultText, filter.name))
						.appendTo(node)
						.addClass('list-item-relation');


						k++;

					}
					else
					{
						break;
					}

				}
				
			},
			error: function(data) {
			}		
		});
	}
	else if(filter.type == "class")
	{
		var text = $('<a/>')
			.text("is a {0}".format(filter.name))
			.appendTo(node)
			.addClass('list-item-relation');
	}
	else if(filter.type == "property")
	{
		var query = "SELECT DISTINCT ?o WHERE { <{0}> ^<{1}>|<{1}> ?o. FILTER regex(?o, 'http://dbpedia.org/resource') }".format(result.uri, filter.uri);
		var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=" + encodeURIComponent(query);

		$.ajax({
			dataType: 'json',
			url: queryUrl,
			success: function(data) {    
				var k = 0;

				for(i in data.results.bindings) {


					if(k < 3)
					{
						var resultUri = data.results.bindings[i]["o"]["value"];
						var resultText = resultUri.split('\\').pop().split('/').pop().split('_').join(' ');

						var text = $('<a/>')
						.text("{0} {1}".format(filter.name, resultText))
						.appendTo(node)
							.addClass('list-item-relation');

						k++;
					}
					else
					{
						break;
					}
				}
			
				
			},
			error: function(data) {
			}		
		});
	}
}


function renderExpand(node, result, expand, resultSet)
{
	if(resultSet.base != null) 
	{
		var inner = "select ?s0 where { {0} } ORDER BY DESC(count(?s0))".format(generateQuery(resultSet.base, 0));

		var query = "SELECT DISTINCT ?s0 WHERE { <{2}> {0}<{1}> ?s0. { {3} } FILTER regex(?s0, 'http://dbpedia.org/resource') } LIMIT 5".format(expand.dir, expand.uri, result.uri, inner);
		var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=" + encodeURIComponent(query);

		$.ajax({
			dataType: 'json',
			url: queryUrl,
			success: function(data) {    
				for(i in data.results.bindings) {
					var resultUri = data.results.bindings[i]["s0"]["value"];
					var resultText = resultUri.split('\\').pop().split('/').pop().split('_').join(' ');

					var text = $('<a/>')
					.text("{0} {1}".format(expand.name, resultText))
					.appendTo(node)
					.addClass('list-item-relation');
				}
				
			},
			error: function(data) {
			}		
		});
	}
}