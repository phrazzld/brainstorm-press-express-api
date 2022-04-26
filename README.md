# Brainstorm Press (API)

Brainstorm Press is a blogging platform with payments enabled by the Bitcoin Lightning Network.

[![GitHub license](https://img.shields.io/github/license/phrazzld/brainstorm-press-client)](https://github.com/phrazzld/brainstorm-press-client/blob/master/LICENSE)

The Brainstorm Press API is built with Node, Express, and TypeScript. The database is a MongoDB Atlas cluster, managed with [Mongoose](https://mongoosejs.com/). Lightning invoice statuses are communicated to the client via WebSocket.

Corresponding client code [here](https://github.com/phrazzld/brainstorm-press-client).

## Testing

`yarn test` will run unit and integration tests built with [Jest](https://jestjs.io/). They depend on a locally running Lightning Network, like [Polar](https://lightningpolar.com/).

## Production

The Brainstorm Press API is currently live and hosted on Heroku.

## Acknowledgements

This project is largely based on the [Lightning Labs Builder's Guide](https://docs.lightning.engineering/lapps/guides). Huge shoutout to Lightning Labs.
