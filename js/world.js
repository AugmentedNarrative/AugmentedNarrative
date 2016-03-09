$(document).ready (function () { 
	var conf = {
		data: {
			world: {
				type: d3.json,
				url: '/data/world.json',
				id: "world",
				key: "countries",
				enumerator: "geometries",
				idProperty: function (a) { return a.id; } 
			},
			countries_categories: { 
				type: d3.csv,
				url: '/data/countries_categories.csv',
				id: "countries_categories",
				processor: function (rows) { 
					//var years = [1990,2000,2006,2007,2008,2009,2010,2011,2012,2013,2014]; 	
					this.data.regions = new Nestify (rows, ["region", "code"], ["income_group", "currency"]).data; 
					this.data.incomes = new Nestify (rows, ["income_group", "code"], ["region", "currency"]).data; 
					this.data.currencies = new Nestify (rows, ["currency", "code"], ["region", "income_group"]).data; 
					this.data.by_code = new Nestify (rows, ["code"], ["region", "income_group", "currency"]).data;
				}
			},
			countries_data: { 
				type: d3.csv,
				url: '/data/countries_data.csv',
				id: "countries_data",
				processor: function (rows) { 
					var years = [1990,2000,2006,2007,2008,2009,2010,2011,2012,2013,2014]; 
					this.data.population = new Nestify (rows, ["code"], years, d3.sum).data;
					this.data.by_year = {};
					var regions = this.data.regions.items ();
					var parse = [
						{"parse": ".control.year.highlight"},
						{"parse": ".control.region.highlight"},
						{"parse": ".control.country.highlight"}
					];
					$("#movie").append ($("<a>").text("all").addClass ("ctrl").attr ({"id": "all_ctrl", "data-parse": true}).data ({"parse": parse}));
					for (var y in years) { 
						//INTERESTING: This commented use case jumps from one nest to an internalKey so you can have:
						// {1990: TOTAL POP IN 1990, 2000: SAME ... }
						//var x = new Nestify (rows, ["code"], [years [y]], d3.max, years [y]).data;
						//
						var x = new Nestify (rows, ["code"], ["code", years [y]], d3.max).data;
						this.data.by_year [years [y]] = 0;
						var countries = x.items ();
						// YEAR CONTROLS
						var parse = [
							{"control_chart": "countries", "quantify": "population", "quantifier": "population", "quantifier_args": {year: years [y]}},
							{"control_element": ".year", "element_remove_class": "highlight hover"},
							{"control_element": ".year_" + years [y], "element_add_class": "highlight hover"}
						];
						for (var r in regions) { 
							var regionName = regions [r].key;
							var region = regionName.toLowerCase ().replace (/&/g, "").replace (/\s/g, "_");
							
							parse.push ({"control_chart": "countries_" + region, "quantify": "regions", "quantifier": "countries", "quantifier_args": {"region": regionName, "year": years [y]} });
						}
						// lets re run the highlighted region and country... 
						parse.push ({"parse": ".control.region.highlight"});
						parse.push ({"parse": ".control.country.highlight"});
						var control = $("<a>").attr({"id": "year_" + years [y], "data-control": true}).addClass ("control year year_" + years [y]).text (years [y]).data ({"parse": parse})
						$("#ctrls").append (control);

						for (var c in countries) {
							var country = countries [c];
							this.data.by_year [years [y]] += country.values [years [y]].value;
							if (!this.data.by_year [country.key]) this.data.by_year [country.key] = {};
							this.data.by_year [country.key] [years [y]] = country.values [years [y]].value;
						}

					}
					for (var x in rows) { 
						var row = rows [x];
						var cats = this.data.by_code [row.code];
						if (cats) { 
							for (var y in years) { 
								var year = years [y];
								if (!this.data.incomes [cats.income_group.value][year]) { 
									this.data.incomes [cats.income_group.value][year] = 0;
								}
								if (!this.data.currencies [cats.currency.value][year]) { 
									this.data.currencies [cats.currency.value][year] = 0;
								}
								if (!this.data.regions [cats.region.value][year]) { 
									this.data.regions [cats.region.value][year] = 0;
								}
								this.data.incomes [cats.income_group.value][year] += parseInt (row [year]);
								this.data.currencies [cats.currency.value][year] += parseInt (row [year]);
								this.data.regions [cats.region.value][year] += parseInt (row [year]);
							}
						}
					}
					var categorized = false;
					for (var r in regions) {
						var regionName = regions [r].key;
						var regionValues = regions [r].values;
						var region = regionName.toLowerCase ().replace (/&/g, "").replace (/\s/g, "_");
						var c = $("<div>").addClass ("scene").append ($("<h1>").text (regionName)); 
						// REGION CONTROLS
						// TODO: modify year in quantifier_args when the year changes :)
						var countries = regionValues.items ();

						var parse = [
							{"control_element": "#ctrl_region_" + region, "element_add_class": "highlight hover"},
							{"control_element": ".region:not(.region_"+region+")", "element_remove_class": "highlight hover"},
							{"control_element": "#countries .region_" + region, "element_add_class": "highlight hover"},
							//TODO de-duplicate this... 
							{"control_element": "#countries_years .region_" + region, "element_add_class": "highlight hover"},
							{"control_element": ".region:not(.region_" + region + ") .control.country.highlight", "element_remove_class": "highlight hover"},
							{"control_element": "#world_map .region_" + region, "element_add_class": "highlight"},
						];
						var ctrl = $("<a>").attr ({"id": "ctrl_region_" + region, "data-control": true}).text (regionName).data ({"parse": parse}).addClass ("control ctrl_region region region_" + region);
						$("#regions_ctrls").append (ctrl);
						c.data ({"parse": "#ctrl_region_" + region});
						c.attr ('id', "region_" + region);

						var chart = $("<div>")
							.attr ("id", "countries_" + region)
							.addClass("col-md-6 chart")
							.css ({"height": "100px"})
							.data ({
								"chart": "bars", 
							});
						chart.append ($("<h3>").text ("Population by country").addClass ("label"));

						//COUNTRIES CONTROLS
						for (var i in countries) {
							parse = [
								{"control_element": ".country", "element_remove_class": "highlight hover"},
								{"parse": "#ctrl_region_" + region},
								{"control_element": ".country_" + countries [i].key, "element_add_class": "highlight hover"},
							];
							ctrl = $("<a>").attr ({"id": "ctrl_country_" + countries [i].key, "data-control": true}).text (countries [i].key+" ").data ({"parse": parse}).addClass ("control ctrl_country country country_" + countries [i].key + " region region_" + region);
							c.append (ctrl);
						}
						$("#movie").append (c);
						c.append (chart);
						this.initChart (chart);
						/*
						var years = $("<div>")
							.attr ("id", "years_" + region)
							.addClass ("col-md-6 region_years chart")
							.css ({"height": "100px"})
							.data ({
								"chart": "",
							});
						c.append (years);
						years.append ($("<h3>").text ("Population in country by year").addClass ("label"));
						this.initChart (years);
						*/
					}
					this.initControls ();
					this.initScroll ();
				}
			}
		},
		prequantifiers: {
			categorize: function () { 
			},
			// note: we need to define a prequantifier when using a chart other than the map as we need the scales and all that
			population: function (args) { 
				// if args is empty then we will quantify the worlds population by year
				//TODO make this receive arguments so we can use it for multiple years... 
				var data;
				if (args == undefined) { 
					var yearsPop = {};
					var extent = this.data.regions.extent (
						function (a) { 
							for (var y in a.values) { 
								if ( parseInt (y) === Number (y)) { 
									if (!yearsPop [y]) yearsPop [y] = 0;
									yearsPop [y] += parseInt (a.values [y]);
								} 
							} 
							return 0; //FIXME.. maybe implement a .each instead of .extent discard this 
						});
					data = [];
					var max = 0, min;
					for (var y in yearsPop) { 
						if (!min) min = yearsPop [y];
						if (yearsPop [y] < min) min = yearsPop [y];
						if (yearsPop [y] > max) max = yearsPop [y];
						data.push ({key: y, value: yearsPop [y]});
					}
					extent = [min, max];

				} else { 
					var year = args.year ? args.year : 1990;

					var extent = this.data.regions.extent (function (a) { return a.values [year]; })
					extent = [0, extent [1]];
					data = this.data.regions;

				}
				return {data: data, scale: d3.scale.linear ().domain (extent)};
			},
			countries: function (args) {
				var cdy = this.data.by_year;
				var cdc = this.data.by_code;
				var extent = this.data.regions [args.region]
					.extent (function (a) { 
						if (a.key !== Number (a.key)) { 
							if (cdc [a.key].region.value == args.region && cdy [a.key]) { 
								return cdy [a.key] [args.year]; 
							}
						} 
					});
				extent = [0, extent [1]];
				return {data: this.data.regions [args.region], scale: d3.scale.linear ().domain (extent)};
			},
			years: function (args) { 
				
				var min = 0, max = 0, items = [];
				if (args.country) {
					var cdy = this.data.by_year;
					//FIXME: by_year was not created using Nestify so we dont have extent nor min nor max
					for (var y in this.data.by_year [args.country]) {
						var num = this.data.by_year [args.country][y];
						if (!min) min = num; 
						if (num < min) min = num;
						if (num > max) max = num;
						items.push ({key: y, value: num, country: args.country});
					}
				}
				var extent = [min, max];
				return {data: items, scale: d3.scale.linear ().domain (extent)};
			},
			regions: function (args) { 
				var items = [], max = 0, min = 0;
				var t = this.data.regions.items ();
				for (var r in t) {
					var vals = [];
					for (var y in t [r].values) {
						if (parseInt (y) == Number (y)) { 
							vals.push (t [r].values [y])
						}
					}
					var region = t [r].key.toLowerCase ().replace (/&/g, "").replace (/\s/g, "_");
					items.push ({key: t [r].key, values: vals, attrs: {"class": "line region region_" + region, data: {parse: "#ctrl_region_" + region }}}); 
				}
				console.log (items);
				var extent = [min, max];
				return {data: items, scale: d3.scale.linear ().domain (extent)};
			}
		},
		quantifiers: {
			maps: { 
				categorize: function (a) { 
					var cntr = this.data.by_code [a.properties.ISO3];
					if (cntr) {
						var regionName = cntr.region.value;
						var region = regionName.toLowerCase ().replace (/&/g, "").replace (/\s/g, "_");
						var income = cntr.income_group.value.toLowerCase ().replace (/\s/g, "_").replace (/\:/g, "");
						var data = {"parse": "#ctrl_country_" + a.properties.ISO3};
						return {"class": "country region region_" + region + " income_" + income + " country_" + a.properties.ISO3, "data": data};
					}
				}
			},
			bars: { 
				population: function (a, x, d) { 
					var height,cls,region;
					var data = {};
					if (x === undefined) {
						height = d.scale (a.value);
						data = {};
						data.parse = "#year_" + a.key;
						cls = "year year_" + a.key;
					} else {
						var year = x.year ? x.year : 1990;
						height = d.scale (a.values [year]);
						region = a.key.toLowerCase ().replace (/&/g, "").replace (/\s/g, "_");
						cls = "region region_" + region;
						data.parse = [
							{parse: "#ctrl_region_" + region},
							{"control_scroll": "movie", "scroll_to": "region_" + region },
						];
					}
					return {"height": parseInt (height), "class": cls, "data": data}; 
				},
				countries: function (a, x, d) { 
					var height = 0;
					if (this.data.by_year [a.key]) {
						height = d.scale (this.data.by_year [a.key][x.year]);
					}
					var regionName = this.data.by_code [a.key].region.value
					var region = regionName.toLowerCase ().replace (/&/g, "").replace (/\s/g, "_");
					var data = {"parse": "#ctrl_country_" + a.key}; 
					return {"height": height, "data": data, "class": "country country_" + a.key + " region region_" + region}
				},
				years: function (a, x, d) { 
					return {"height": d.scale (a.value), "class": "year year_" + a.key};
				},
				regions: function (a, x, d) { 
					return {"height": d.scale (a.value), "class": "year year_" + a.year};
				}
			},
			lines: {
				regions: function (a,x, d) {
					var scale = d3.scale.linear().domain([0, 1000000000]).range ([0, 100]);
					return {y: scale (a), "class": "point", "r": 2};
				}
			}

		}
	};
	var d = new Ant (conf); 
});
