import * as d3 from "d3";
import * as topojson from "topojson-client";
const spainjson = require("./spain.json");
const d3Composite = require("d3-composite-projections");
import { latLongCommunities } from "./communities";
import { initialStats, finalStats, ResultEntry } from "./stats";

const aProjection = d3Composite
  .geoConicConformalSpain() // Let's make the map bigger to fit in our resolution
  .scale(3300)
  // Let's center the map
  .translate([500, 400]);

const geoPath = d3.geoPath().projection(aProjection);
const geojson = topojson.feature(spainjson, spainjson.objects.ESP_adm1);

const svg = d3
  .select("body")
  .append("svg")
  .attr("width", 1024)
  .attr("height", 800)
  .attr("style", "background-color: #FBFAF0");

const calculateMaxAffected = (dataset: ResultEntry[]) => {
  return dataset.reduce(
    (max, item) => (item.value > max ? item.value : max),
    0
  );
};


const calculateAffectedRadiusScale = (maxAffected: number) => {
  return d3.scaleLinear().domain([0, maxAffected]).range([0, 20]);
};

const calculateRadiusBasedOnAffectedCases = (
  comunidad: string,
  dataset: ResultEntry[]
) => {
  const maxAffected = calculateMaxAffected(dataset);

  const affectedRadiusScale = calculateAffectedRadiusScale(maxAffected);

  const entry = dataset.find((item) => item.name === comunidad);

  const adder = d3
    .scaleThreshold<number, number>()
    .domain([
      0,
      1000,
      10000,
      100000,
    ])
    .range([1, 5, 10, 20]);

  return entry ? affectedRadiusScale(entry.value) + adder(maxAffected) : 0;
};

const getScaledColor = (dataset: ResultEntry[]) => {
  const maxValue = calculateMaxAffected(dataset);

  const color = d3
    .scaleThreshold<number, string>()
    .domain([
      0,
      maxValue * 0.1,
      maxValue * 0.25,
      maxValue * 0.5,
      maxValue * 0.75,
      maxValue,
    ])
    .range(["#fcfeff", "#c3d3db", "#80a9bd", "#5089a6", "#227199", "#04364f"]);

  return color;
};

const assignColorToCommunity = (comunidad: string, dataset: ResultEntry[]) => {
  const entry = dataset.find((item) => item.name === comunidad);

  const color = getScaledColor(dataset);

  return entry ? color(entry.value) : color(0);
};

document
  .getElementById("initial")
  .addEventListener("click", function handleInitialStats() {
    updateChart(initialStats);
  });

document
  .getElementById("final")
  .addEventListener("click", function handleFinalStats() {
    updateChart(finalStats);
  });

const updateChart = (dataset: ResultEntry[]) => {
  svg
    .selectAll("path")
    .data(geojson["features"])
    .attr("class", "country")
    // data loaded from json file
    .attr("d", geoPath as any)
    .transition()
    .duration(800)
    .style("fill", function (d: any) {
      return assignColorToCommunity(d.properties.NAME_1, dataset);
    });

  svg
    .selectAll("circle")
    .data(latLongCommunities)
    .attr("class", "affected-marker")
    .attr("cx", (d) => aProjection([d.long, d.lat])[0])
    .attr("cy", (d) => aProjection([d.long, d.lat])[1])
    .transition()
    .duration(800)
    .attr("r", (d) => calculateRadiusBasedOnAffectedCases(d.name, dataset));
    
};

svg
    .selectAll("path")
    .data(geojson["features"])
    .enter()
    .append("path")
    .attr("class", "country")
    // data loaded from json file
    .attr("d", geoPath as any)
    .style("fill", function (d: any) {
      return assignColorToCommunity(d.properties.NAME_1, initialStats);
    });

svg
    .selectAll("circle")
    .data(latLongCommunities)
    .enter()
    .append("circle")
    .attr("class", "affected-marker")
    .attr("cx", (d) => aProjection([d.long, d.lat])[0])
    .attr("cy", (d) => aProjection([d.long, d.lat])[1])
    .attr("r", (d) => calculateRadiusBasedOnAffectedCases(d.name, initialStats));