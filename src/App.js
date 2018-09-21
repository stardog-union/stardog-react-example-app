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
import CircularProgress from '@material-ui/core/CircularProgress';
import {
  TableDataAvailabilityStatus,
  columnData,
  columnSelectors,
} from "./helpers/constants";

// Let's not take _quite_ the entire browser screen.
const styles = {
  appInnerContainer: {
    width: '90%',
    margin: '0 auto',
  },
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dataState: TableDataAvailabilityStatus.NOT_REQUESTED,
      data: []
    };
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
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? <CircularProgress /> : (
                data.map(bindingForTable => (
                  <TableRow key={bindingForTable.id}>
                    {columnSelectors.map((selector) => {
                      const bindingValue =
                        bindingForTable[
                          selector === "movie" ? "movies" : selector
                        ];
                      const text = Array.isArray(bindingValue)
                        ? bindingValue.join(", ")
                        : bindingValue;
                      return <TableCell key={selector}>{text}</TableCell>;
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      </div>
    );
  }
}

export default App;

