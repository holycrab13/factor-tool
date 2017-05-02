
// An instance, class or property
class GraphElement
{
	string name;
	string uri;
}

class Instance : GraphElement
{

}

class Class : GraphElement
{

}

class Property : GraphElement
{
	string dir;
}

// Interface for filtering a queryset
interface IFilter
{
	string GenerateFilterQuery(int n)
}

class Expand
{
	Property property;
}

// Core class of the query generation. A query set configuration results in exactly one result set
class QuerySet
{
	QuerySet base;
	IFilter[] filters;
	Expand[] expands;

	// Additional parameters (REGEX, LIMIT, etc.) for query generation

	// void AddFilter
	// void AddExpand

	string GenerateQuery(QuerySet set, int n)
	{
		if(set.base == null)
		{
		 	return printFilters(n, set.filters);
		}
		else
		{
			string result;

			result += printFilters(n, set.filters);
			result += printExpands(n, set.expands);

			return result + GenerateQuery(set.base, n + 1);
		}
	}

	string printFilters(n : int, filters : filter[])
	{
		string result;

		foreach(filter in filters)
		{
			result += filter.GenerateFilterQuery(n);
		}

		return result;
	}

	string printExpands(n : int, expands : expand[])
	{
		string result;

		foreach(expand in expands) 
		{
			result += string.Format("{ S{0} {1} S{2} } UNION ", n, expand.property, n + 1)
		}

		return result;
	}
}

class InstanceFilter : IFilter
{
	Instance instance;
	Property property;

	override void GenerateFilterQuery(int n)
	{
		return (Sn) (property) (object)

		// OR

		return (Sn) ?p (object) UNION (object) ?p (Sn) 
	}
}

class ClassFilter : IFilter
{
	Class class

	override void GenerateFilterQuery(int n)
	{
		return (Sn) is_a (class)
	}
}

class ConstantFilter : IFilter
{
	string filterValue;
	string comparator;
	Property property;

	override void GenerateFilterQuery(int n)
	{
		return (Sn) (property) ?propVal. FILTER(comparator(?propVal, filterValue)).
	}
}

class PropertyFilter : IFilter
{
	Property property;

	override void GenerateFilterQuery(int n)
	{
		return (Sn) (property) ?x.
	}
}


// WORKFLOW:

// 1) Empty Set
// 2) Add 1..n Filter
// 3) Generate Query
// 4) Add Expand
// 5) Generate child set with added expand and 0 filters, Go to 2)



// Problems:

// Incremental Querying and Query Caching? (Performance) -> Klaus Stadler
// Verbalisation of Queries (User Friendlyness)
// GraphElement extraction from Keywords, currently DBpedia Lookup (Variety of Types)


// rdfs:type: property/class/resource
// property range/domain ?? -> text

// hide ambiguities -> property/ontology properties
				//	-> class/resource with same name