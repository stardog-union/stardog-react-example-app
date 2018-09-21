const { Connection } = require("stardog");

// Table column data, encoding the order, label, and "selector" for grabbing the
// data for each column.
const columnData = [
  {
    selector: "id",
    label: "ID"
  },
  {
    selector: "name",
    label: "Name"
  },
  {
    selector: "movie",
    label: "Movies"
  },
  {
    selector: "homePlanet",
    label: "Home Planet"
  },
  {
    selector: "kind",
    label: "Kind"
  },
];

// For convenience, we'll also produce the array of selectors just once, and
// export it for re-use.
const columnSelectors = columnData.reduce(
  (selectors, { selector }) => [...selectors, selector],
  []
);

// In a typical application, the connection would be changeable. For our
// present purposes, though, this is unchanging and hard-coded.
const conn = new Connection({
  username: "admin",
  password: "admin",
  endpoint: "http://localhost:5820"
});

// An "enum" for the status of our request to Stardog for data.
const TableDataAvailabilityStatus = {
  NOT_REQUESTED: 'NOT_REQUESTED',
  LOADING: "LOADING",
  LOADED: "LOADED",
  FAILED: "FAILED"
};

module.exports = {
  dbName: 'StarWarsDB',
  columnData,
  columnSelectors,
  conn,
  TableDataAvailabilityStatus,
};

