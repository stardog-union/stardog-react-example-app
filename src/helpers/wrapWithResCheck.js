// Given a function, returns a function that accepts a `res` object,
// and which only executes the first function if `res.ok` (throws otherwise).
const wrapWithResCheck = fn => res => {
  if (!res.ok) {
    throw new Error(
      `Something went wrong. Received response: ${res.status} ${res.statusText}`
    );
  }
  return fn(res);
};

module.exports = {
  wrapWithResCheck,
};

