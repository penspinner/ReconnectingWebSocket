# ReconnectingWebSocket

Instantiate a ReconnectingWebSocket instance:
`const webSocket = new ReconnectingWebSocket(url, options)`

Default options are

```
{
    autoReconnectMS: 3000,
    stopReconnectingAfter: 36000
}
```
