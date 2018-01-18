const convertDaysToMS = days => days * 1000 * 60 * 60 * 24;
const convertHoursToMS = hours => hours * 1000 * 60 * 60;

const dayInMS = convertDaysToMS(1);
const hourInMS = convertHoursToMS(1);

const parseTimeToMS = (time) => {
  if (Number.isFinite(time)) return time;

  switch (time) {
    case 'd':
    case 'D':
    case 'day': {
      return dayInMS;
    }

    case 'h':
    case 'H':
    case 'hour': {
      return hourInMS;
    }

    default: {
      return time;
    }
  }
};

/**
 * ReconnectingWebSocket is a wrapper class for WebSocket with an extra functionality of attempting
 * to reconnect if the WebSocket connection closes. It also exposes WebSocket's methods
 * addEventListener, removeEventListener, close, and send for convenience. Other WebSocket methods
 * are invokable by calling ReconnectingWebSocket's `instance` variable.
 *
 * Note: at the moment, the `open` event will not be called upon successful reconnection.
 *
 * Default: reconnect every 2 seconds for 1 hour; will stop attempting to reconnect after 1 hour.
 */
export default class ReconnectingWebSocket {
  constructor(url, { autoReconnectMS = 3000, stopReconnectingAfter = hourInMS } = {}) {
    this.autoReconnectMS = autoReconnectMS;
    this.stopReconnectingAfterMS = parseTimeToMS(stopReconnectingAfter);
    this.url = url;
    this.reconnectAttempts = 0;
    this.eventListeners = [];

    this.initWebSocketInstance();
  }

  /**
   * Adds the close event listener.
   */
  addCloseEventListener = () => {
    this.addEventListener('close', this.handleWebSocketCloseEvent);
  };

  /**
   * Handles the WebSocket's close event. Starts reconnecting to the WebSocket url. Also stops
   * reconnecting after the instance variable: stopReconnectingAfterMS.
   */
  handleWebSocketCloseEvent = () => {
    this.startReconnecting();

    if (this.stopReconnectingAfterMS > 0) {
      setTimeout(() => {
        if (this.reconnectInterval) {
          this.stopReconnecting();
          this.resetReconnectAttempts();
        }
      }, this.stopReconnectingAfterMS);
    }
  };

  /**
   * Initializes the instance to a new WebSocket with the url.
   */
  initWebSocketInstance() {
    this.instance = new WebSocket(this.url);

    if (!this.reconnectInterval) {
      this.addCloseEventListener();
    }
  }

  /**
   * Resets the reconnect attempts back to 0.
   */
  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
  }

  /**
   * Attaches all event listeners that were previously attached to the WebSocket before it
   * disconnected.
   */
  attachPreviousEventListeners = () => {
    this.eventListeners.forEach((eventListener) => {
      this.instance.addEventListener(...eventListener);
    });
  };

  /**
   * Attempts to reconnect the WebSocket to the url until. If successfully reconnected, stop the
   * reconnect interval, reset reconnect attempts back to 0, attach event listeners that were
   * previously attached to the WebSocket instance, and then attach the reconnecting close event
   * listener.
   */
  startReconnecting = () => {
    this.reconnectInterval = setInterval(() => {
      console.warn(`Attempting to reconnect WebSocket: ${(this.reconnectAttempts += 1)}.`);

      const { readyState } = this.instance;

      if (readyState === WebSocket.CLOSED || readyState === WebSocket.CLOSING) {
        this.removeEventListener('close', this.handleWebSocketCloseEvent);
        this.initWebSocketInstance();
      } else if (readyState === WebSocket.OPEN) {
        this.stopReconnecting();
        this.resetReconnectAttempts();
        this.attachPreviousEventListeners();
        this.addCloseEventListener();
      }
    }, this.autoReconnectMS);
  };

  /**
   * Clears the reconnect interval to stop attempting to reconnect the WebSocket.
   */
  stopReconnecting() {
    clearInterval(this.reconnectInterval);
    this.reconnectInterval = null;
  }

  // Below are convenience wrapper methods for the WebSocket instance.

  /**
   * Stores the event listener args in the array eventListeners and then adds the event listener to
   * the WebSocket instance.
   * @param {array} args
   */
  addEventListener(...args) {
    this.eventListeners.push(args);
    this.instance.addEventListener(...args);
  }

  /**
   * Removes the event listener args from the array eventListeners and then removes the event
   * listener from the WebSocket instance.
   * @param {array} args
   */
  removeEventListener(...args) {
    this.eventListeners = this.eventListeners.filter(eventListener =>
      !eventListener.every((eventListenerArg, index) => args[index] === eventListenerArg));
    this.instance.removeEventListener(...args);
  }

  close() {
    this.instance.close();
  }

  send(...args) {
    this.instance.send(...args);
  }
}

