

Factor Tool Setup


Steps:

1. Setup a solr running on your localhost. Create a core called factor_tool and run it on Port 8984

(bin\solr.cmd start -p 8984)

2. Run the rdf-to-solr program. It will fill the Solr with instances for testing

3. Add some test classes manually like

	{
		"name" : "Actor",
		"uri" : "http://dbpedia.org/ontology/Actor",
		"weight" : 1.0
	},
	{
		"name" : "Film",
		"uri" : "http://dbpedia.org/ontology/Film",
		"weight" : 1.0
	},
	{
		"name" : "Person",
		"uri" : "http://dbpedia.org/ontology/Person",
		"weight" : 1.0
	},
	{
		"name" : "Place",
		"uri" : "http://dbpedia.org/ontology/Place",
		"weight" : 1.0
	}

4. Run the index.html and enjoy!