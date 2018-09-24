import { query } from "stardog";
import React, { Component } from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import {
  TableDataAvailabilityStatus,
  columnData,
  columnSelectors,
  conn,
  dbName
} from "./helpers/constants";
import Button from "@material-ui/core/Button";

// Let's not take _quite_ the entire browser screen.
const styles = {
  appInnerContainer: {
    width: "90%",
    margin: "0 auto"
  },
  actionCell: {
    textAlign: "center"
  }
};

const readQuery = `SELECT ?id ?name ?homePlanet ?kind ?movie {
  ?subject a ?kind ;
    :id ?id ;
    :name ?name ;
    :appearsIn ?movie .
  ?kind rdfs:subClassOf :Character .
  OPTIONAL { ?subject :homePlanet ?homePlanet } .
  FILTER (?kind != :Character)
}`;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dataState: TableDataAvailabilityStatus.NOT_REQUESTED,
      data: []
    };
  }

  componentDidMount() {
    this.refreshData();
  }

  refreshData() {
    this.setState(
      {
        dataState: TableDataAvailabilityStatus.LOADING
      },
      () => {
        query.execute(conn, dbName, readQuery).then(res => {
          if (!res.ok) {
            this.setState({
              dataState: TableDataAvailabilityStatus.FAILED
            });
            return;
          }

          const { bindings } = res.body.results;
          const bindingsForTable = this.getBindingsFormattedForTable(bindings);

          this.setState({
            dataState: TableDataAvailabilityStatus.LOADED,
            data: bindingsForTable
          });
        });
      }
    );
  }

  // Our SPARQL query gets a new "row" for each character for each movie in
  // which the character appears. We don't want to _display_ multiple rows for
  // the same character, though. Instead, we want to show _one_ row for each
  // character, and, if the character was in multiple movies, we want to show
  // all of those movies as a group within that character's single row. This
  // method goes through the bindings, groups them under each individual
  // character's id, then merges them together, aggregating the movies as an
  // array of strings. It also cleans up some of the data so that it's more
  // readable in the UI.
  getBindingsFormattedForTable(bindings) {
    // Group the bindings by each character id, in case multiple rows were
    // returned for a single character.
    const bindingsById = bindings.reduce((groupedBindings, binding) => {
      const { value: id } = binding.id;
      groupedBindings[id] = groupedBindings[id]
        ? groupedBindings[id].concat(binding)
        : [binding];
      return groupedBindings;
    }, {});

    // Sort the bindings by id (ascending), then, if there are multiple
    // bindings for a single id, merge them together, aggregating movies as an
    // array.
    return Object.keys(bindingsById)
      .map(id => parseInt(id, 10)) // convert ids from strings to numbers for sorting
      .sort() // we do this sorting client-side because `Object.keys` ordering is not guaranteed
      .map(id => {
        // For each `id`, merge the bindings together as described above.
        return bindingsById[id].reduce(
          (bindingForTable, binding) => {
            const bindingValues = Object.keys(binding).reduce(
              (valueBinding, key) => {
                const { type, value } = binding[key];
                valueBinding[key] =
                  type !== "uri"
                    ? value
                    : value.slice(value.lastIndexOf("/") + 1); // data cleanup
                return valueBinding;
              },
              {}
            );
            const movies = bindingValues.movie
              ? bindingForTable.movies.concat(bindingValues.movie)
              : bindingForTable.movies;
            delete bindingValues.movie;
            return {
              ...bindingForTable,
              ...bindingValues,
              movies
            };
          },
          { movies: [] }
        );
      });
  }

  render() {
    const { dataState, data } = this.state;
    const isLoading = dataState === TableDataAvailabilityStatus.LOADING;

    return (
      <div className="App" style={styles.appInnerContainer}>
        <CssBaseline />
        <Paper>
          <Toolbar>
            <Typography variant="title">
              <i>Star Wars</i> with Stardog
            </Typography>
          </Toolbar>
          <Table>
            <TableHead>
              <TableRow>
                {columnData.map(({ label }) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
                <TableCell style={styles.actionCell}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <CircularProgress />
              ) : (
                data
                  .map(bindingForTable => (
                    <TableRow key={bindingForTable.id}>
                      {columnSelectors.map(selector => {
                        const bindingValue =
                          bindingForTable[
                            selector === "movie" ? "movies" : selector
                          ];
                        const text = Array.isArray(bindingValue)
                          ? bindingValue.join(", ")
                          : bindingValue;
                        return <TableCell key={selector}>{text}</TableCell>;
                      })}
                      <TableCell key={-1} style={styles.actionCell}>
                        <Button color="secondary">Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))
                  .concat(
                    <TableRow key={-1}>
                      {columnData.map(({ label, selector }) => (
                        <TableCell key={selector}>
                          <label>
                            {label}
                            <input name={selector} />
                          </label>
                        </TableCell>
                      ))}
                      <TableCell style={styles.actionCell}>
                        <Button color="primary">Add</Button>
                      </TableCell>
                    </TableRow>
                  )
              )}
            </TableBody>
          </Table>
        </Paper>
      </div>
    );
  }
}

export default App;
