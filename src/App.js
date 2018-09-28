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
    margin: "20px auto 0"
  },
  paper: {
    overflowX: 'auto',
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

  // NOTE: Does no validation and assumes certain inputs; not production-ready!
  addItem() {
    // Get the input elements and create a map from their names to their
    // values.
    const inputs = document.querySelectorAll("input[name]");
    const inputsArray = Array.from(inputs);
    const valueMap = inputsArray.reduce(
      (accumulator, input) => ({
        ...accumulator,
        [input.name]: input.value
      }),
      {}
    );
    // Auto-generate a subject local name by removing all whitespace and
    // lowercasing the `name` input. This is "good enough" for our purposes.
    const subject = valueMap.name
      .trim()
      .split(/\s/)
      .join("")
      .toLowerCase();
    // Convert comma-separated movie values into an array of movies.
    const movies = valueMap.movie
      .split(",")
      .map(
        mov =>
          `:${mov
            .split(/\s/)
            .join("")
            .trim()}`
      )
      .join(", ");
    const updateTriples = `:${subject} a :${valueMap.kind} ;
      :id ${valueMap.id} ;
      :name "${valueMap.name}" ;
      :appearsIn ${movies} ;
      ${valueMap.homePlanet ? ":homePlanet :" + valueMap.homePlanet : ""} .
    `;
    const updateQuery = `insert data { ${updateTriples} }`;

    // Add data to DB and clear the inputs when this succeeds.
    query.execute(conn, dbName, updateQuery).then(() => {
      inputsArray.forEach(input => (input.value = ""));
      // A full refresh of the data isn't really optimal here, but it serves our
      // purposes for this tutorial.
      this.refreshData();
    });
  }

  // Again, no validation or optimization for this example app.
  deleteItem(itemId) {
    // Delete all triples where the subject has the given id.
    const deleteQuery = `delete { ?s ?p ?o } where {
      ?s :id ${itemId} ;
        ?p ?o .
      }`;
    query.execute(conn, dbName, deleteQuery).then(() => this.refreshData());
  }

  // Movie editing is a special case compared with other edits handled below.
  // This is not optimal or truly safe by ANY means, but it conveys the basics.
  handleMovieEdit(innerText, currentItem) {
    const currentValue = currentItem.movies;
    const newMoviesArray = innerText
      .split(",")
      .map(val => val.trim())
      .filter(val => val);

    // If the new value is the same as the one in state, do nothing.
    // In production, we'd probably want to be more careful here.
    if (
      currentValue.length === newMoviesArray.length &&
      currentValue.every((movie, index) => movie === newMoviesArray[index])
    ) {
      return;
    }

    const itemId = currentItem.id;
    const insertableMovies = newMoviesArray
      .map(
        movie =>
          `:${movie
            .split(/\s/)
            .join("")
            .trim()}`
      )
      .join(", ");

    // Do the update. In SPARQL, this is done by a delete + insert.
    query
      .execute(
        conn,
        dbName,
        `delete { ?s :appearsIn ?o }
        insert { ?s :appearsIn ${insertableMovies} }
        where {
          ?s :id ${itemId} ;
            :appearsIn ?o
        }`
      )
      .then(() => this.refreshData());
  }

  // Again, this is not optimal or truly safe by ANY means, but it conveys the basics.
  handleEdit(innerText, dataIndex, valueSelector) {
    const currentItem = this.state.data[dataIndex];
    const isMovieEdit = valueSelector === "movie";

    if (isMovieEdit) {
      this.handleMovieEdit(innerText, currentItem);
      return;
    }

    const currentValue = currentItem[valueSelector];

    // If the new value is the same as the one in state, do nothing.
    if (currentValue === innerText) {
      return;
    }

    const itemId = currentItem.id;
    const predicate = valueSelector === "kind" ? "a" : `:${valueSelector}`;
    const deleteClause = `delete { ?s ${predicate} ?o }`;
    const whereClause = `where { ?s :id ${itemId} ; ${predicate} ?o }`;
    const insertObject =
      valueSelector === "name" ? `"${innerText}"` : `:${innerText}`;
    const insertClause = `insert { ?s ${predicate} ${insertObject} }`;

    // Do the update. In SPARQL, this is done by a delete + insert.
    const fullQuery = `${deleteClause}\n${insertClause}\n${whereClause}`;
    query.execute(conn, dbName, fullQuery).then(() => this.refreshData());
  }

  render() {
    const { dataState, data } = this.state;
    const isLoading = dataState === TableDataAvailabilityStatus.LOADING;

    return (
      <div className="App" style={styles.appInnerContainer}>
        <CssBaseline />
        <Paper style={styles.paper}>
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
                  .map((bindingForTable, index) => (
                    <TableRow key={bindingForTable.id}>
                      {columnSelectors.map(selector => {
                        const bindingValue =
                          bindingForTable[
                            selector === "movie" ? "movies" : selector
                          ];
                        // NOTE: In a production app, we would probably want to do this formatting elsewhere.
                        const text = Array.isArray(bindingValue)
                          ? bindingValue.join(", ")
                          : bindingValue;
                        return (
                          <TableCell
                            key={selector}
                            onBlur={evt =>
                              this.handleEdit(
                                evt.currentTarget.innerText.trim(),
                                index,
                                selector
                              )
                            }
                            contentEditable={selector !== "id"}
                            suppressContentEditableWarning
                          >
                            {text}
                          </TableCell>
                        );
                      })}
                      <TableCell key={-1} style={styles.actionCell}>
                        <Button
                          color="secondary"
                          onClick={() => this.deleteItem(bindingForTable.id)}
                        >
                          Delete
                        </Button>
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
                        <Button color="primary" onClick={() => this.addItem()}>
                          Add
                        </Button>
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
